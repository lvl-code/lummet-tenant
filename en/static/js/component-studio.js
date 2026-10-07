// Dashboard > Components: the visual editor ("Component Studio").
// Every component type gets a form of plain fields, pickers and previews, so nobody has to type
// JSON or code. The form builds the same Content / Settings values that were always stored; the
// raw boxes stay available under "Advanced" and stay in step. Values the form does not know
// about are kept untouched. DOM calls only (no innerHTML); the server checks every value again.
(function () {
  "use strict";

  var form = document.getElementById("componentForm");
  var panel = document.getElementById("csPanel");
  if (!form || !panel) return;

  var typeSel = document.getElementById("componentType");
  var titleEl = form.querySelector('[name="title"]');
  var contentEl = form.querySelector('[name="content"]');
  var settingsEl = form.querySelector('[name="settings_json"]');
  var contentGroup = document.getElementById("csContentGroup");
  var settingsGroup = document.getElementById("csSettingsGroup");
  var body = document.getElementById("csBody");
  var advToggle = document.getElementById("csAdvanced");
  var previewBox = document.getElementById("csPreviewBox");
  var frame = document.getElementById("csPreview");
  var previewNote = document.getElementById("csPreviewNote");

  var SOURCES = [
    ["casino", "Casinos"], ["news", "News"], ["research", "Research"], ["author", "Authors"],
    ["update", "Updates"], ["sportsbook", "Sportsbooks"], ["affiliate_partner", "Affiliate partners"],
    ["custom", "Custom content"], ["media", "Pictures"]
  ];
  var LINK_SOURCES = [["page", "Pages"], ["review", "Reviews"], ["casino", "Casinos"], ["news", "News"], ["research", "Research"], ["author", "Authors"], ["update", "Updates"], ["sportsbook", "Sportsbooks"], ["affiliate_partner", "Affiliate partners"], ["custom", "Custom content"]];
  var RESEARCH_TYPES = ["report", "country", "regulator", "topic", "development", "legislation", "licence"];
  var NEW_TYPES = ["content_grid", "data_table", "section"];
  var FORM_TYPES = ["text", "cta", "banner", "faq_group", "author", "casino_grid", "comparison_table", "news_feed"].concat(NEW_TYPES);
  var uid = 0;
  var S = {};            // settings object being edited
  var busy = false;
  var current = "";
  var ticket = 0;
  var timer = null;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(text, cls, fn) { var b = el("button", cls || "hh-btn", text); b.type = "button"; if (fn) b.addEventListener("click", fn); return b; }
  function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }
  function parseObj(text) { try { var v = JSON.parse(text); return isObj(v) ? v : {}; } catch (e) { return {}; } }

  // ------------------------------------------------------------ saving
  // the form writes into the raw boxes; the existing save code reads them as before
  function commit(opts) {
    if (busy) return;
    settingsEl.value = Object.keys(S).length ? JSON.stringify(S) : "";
    if (opts && opts.contentChanged) contentEl.dispatchEvent(new Event("input", { bubbles: true }));
    schedulePreview();
  }
  function setContent(v) { if (contentEl.value !== v) { contentEl.value = v; } schedulePreview(); }

  // ------------------------------------------------------------ small widgets
  function field(label, hint, control, wide) {
    var f = el("div", "hh-field" + (wide ? " hh-wide" : ""));
    if (label) { var l = el("label", null, label); f.appendChild(l); }
    f.appendChild(control);
    if (hint) f.appendChild(el("p", "hh-hint", hint));
    return f;
  }
  function group(title, sub, open) {
    var d = el("details", "hh-card"); if (open) d.open = true;
    var s = el("summary", null, title); if (sub) s.appendChild(el("span", "hh-sub", sub));
    d.appendChild(s);
    var b = el("div", "hh-body"); d.appendChild(b);
    d.body = b;
    return d;
  }
  function textIn(o, k, ph, max, tag) {
    var i = el(tag || "input"); if (!tag) i.type = "text"; else i.rows = 3;
    i.placeholder = ph || ""; if (max) i.maxLength = max; i.value = o[k] == null ? "" : String(o[k]);
    i.addEventListener("input", function () { o[k] = i.value; commit(); });
    return i;
  }
  function selectIn(o, k, opts, def) {
    var s = el("select");
    opts.forEach(function (p) { var op = el("option", null, p[1]); op.value = p[0]; s.appendChild(op); });
    s.value = o[k] != null && opts.some(function (p) { return p[0] === o[k]; }) ? o[k] : def;
    s.addEventListener("change", function () { o[k] = s.value; commit(); });
    return s;
  }
  function segIn(o, k, opts, def, onChange) {
    var wrap = el("div", "hh-seg"); wrap.setAttribute("role", "radiogroup");
    var name = "cs_" + (++uid);
    var cur = o[k] != null ? String(o[k]) : def;
    opts.forEach(function (p) {
      var l = el("label"); var i = el("input"); i.type = "radio"; i.name = name; i.value = p[0]; i.checked = cur === p[0];
      i.addEventListener("change", function () { o[k] = p[0]; commit(); if (onChange) onChange(); });
      l.appendChild(i); l.appendChild(el("span", null, p[1])); wrap.appendChild(l);
    });
    return wrap;
  }
  function switchIn(o, k, label, def, onChange) {
    var l = el("label", "hh-switch"); var i = el("input"); i.type = "checkbox";
    i.checked = o[k] == null ? def : (o[k] === true || o[k] === "true");
    i.addEventListener("change", function () { o[k] = i.checked; commit(); if (onChange) onChange(); });
    l.appendChild(i); l.appendChild(el("span", "hh-track")); l.lastChild.setAttribute("aria-hidden", "true"); l.appendChild(el("span", null, label));
    return l;
  }
  function rangeIn(o, k, min, max, step, def, unit) {
    var w = el("div", "hh-range"); var i = el("input"); i.type = "range"; i.min = min; i.max = max; i.step = step;
    i.value = o[k] == null || o[k] === "" ? def : o[k];
    var out = el("output", null, i.value + (unit || ""));
    i.addEventListener("input", function () { o[k] = Number(i.value); out.textContent = i.value + (unit || ""); commit(); });
    w.appendChild(i); w.appendChild(out); return w;
  }
  function numIn(o, k, min, max, def) {
    var i = el("input"); i.type = "number"; i.min = min; i.max = max; i.value = o[k] == null || o[k] === "" ? def : o[k];
    i.addEventListener("input", function () { var n = parseInt(i.value, 10); if (isFinite(n)) { o[k] = Math.max(min, Math.min(max, n)); commit(); } });
    return i;
  }
  function colorIn(o, k) {
    var w = el("div", "hh-color"); var p = el("input"); p.type = "color"; p.value = /^#[0-9a-f]{6}$/i.test(o[k] || "") ? o[k] : "#000000";
    p.setAttribute("aria-label", "Colour picker");
    var t = el("input"); t.type = "text"; t.placeholder = "Default"; t.maxLength = 30; t.value = o[k] || "";
    p.addEventListener("input", function () { t.value = p.value; o[k] = p.value; commit(); });
    t.addEventListener("input", function () { o[k] = t.value; if (/^#[0-9a-f]{6}$/i.test(t.value)) p.value = t.value; commit(); });
    var r = btn("Reset", null, function () { t.value = ""; o[k] = ""; commit(); });
    w.appendChild(p); w.appendChild(t); w.appendChild(r); return w;
  }
  function pickMedia(done, kind) {
    var p = window.MediaPicker;
    var fn = p && (kind === "video" ? p.openVideoPicker : p.openImagePicker);
    if (!fn) { window.alert("The Media library is not available on this page. Paste the address instead."); return; }
    fn.call(p, function (m) { if (m) done(m); }, kind === "video" ? "videos" : "banners");
  }
  function imageIn(o, k, ph) {
    var w = el("div", "cs-image");
    var thumb = el("img", "cs-thumb"); thumb.alt = ""; thumb.hidden = true;
    var t = el("input"); t.type = "text"; t.placeholder = ph || "Choose a picture or paste an address"; t.maxLength = 500; t.value = o[k] || "";
    function show() { if (t.value && /^(\/|https:\/\/)/.test(t.value)) { thumb.src = t.value; thumb.hidden = false; } else thumb.hidden = true; }
    t.addEventListener("input", function () { o[k] = t.value; show(); commit(); });
    var pick = btn("Choose from Media", null, function () { pickMedia(function (m) { t.value = m.url || m.public_url || ""; o[k] = t.value; show(); commit(); }); });
    var clear = btn("Remove", null, function () { t.value = ""; o[k] = ""; show(); commit(); });
    var row = el("div", "cs-row"); row.appendChild(t); row.appendChild(pick); row.appendChild(clear);
    w.appendChild(thumb); w.appendChild(row); show(); return w;
  }
  function linkIn(o, k, ph) {
    var w = el("div", "cs-row");
    var t = el("input"); t.type = "text"; t.placeholder = ph || "/en/page or https://..."; t.maxLength = 300; t.value = o[k] || "";
    t.addEventListener("input", function () { o[k] = t.value; commit(); });
    var pick = btn("Pick a page", null, function () { openPicker({ mode: "link" }, function (item) { t.value = item.url; o[k] = item.url; commit(); }); });
    w.appendChild(t); w.appendChild(pick); return w;
  }

  // ------------------------------------------------------------ picker dialog
  function openPicker(opts, onPick) {
    var links = opts.mode === "link";
    var sources = opts.sources || (links ? LINK_SOURCES : SOURCES);
    var src = sources[0][0];
    var back = el("div", "cs-modal"); back.setAttribute("role", "dialog"); back.setAttribute("aria-modal", "true"); back.setAttribute("aria-label", links ? "Pick a page" : "Pick items");
    var box = el("div", "cs-modal__box");
    var head = el("div", "cs-modal__head"); head.appendChild(el("strong", null, links ? "Pick a page to link to" : "Pick items to add"));
    var close = btn("Done", "hh-btn", function () { back.remove(); document.removeEventListener("keydown", onKey); }); head.appendChild(close);
    var tabs = el("div", "hh-seg cs-tabs"); tabs.setAttribute("role", "tablist");
    var search = el("input"); search.type = "search"; search.placeholder = "Search by name…"; search.setAttribute("aria-label", "Search");
    var extra = el("div", "cs-modal__extra");
    var list = el("div", "cs-results"); list.setAttribute("aria-live", "polite");
    var typeIn = null;
    function onKey(e) { if (e.key === "Escape") close.click(); }
    document.addEventListener("keydown", onKey);
    var seq = 0, st = null;
    function run() {
      var mine = ++seq;
      list.textContent = ""; list.appendChild(el("p", "hh-hint", "Searching…"));
      var u = "/en/api/v1/component/pick-search?source=" + encodeURIComponent(src) + "&q=" + encodeURIComponent(search.value) + (links ? "&links=1" : "");
      if (src === "custom" && typeIn && typeIn.value) u += "&type=" + encodeURIComponent(typeIn.value.trim());
      fetch(u).then(function (r) { return r.json(); }).then(function (d) {
        if (mine !== seq) return;
        list.textContent = "";
        var rs = (d && d.results) || [];
        if (src === "custom" && !(typeIn && typeIn.value.trim())) { list.appendChild(el("p", "hh-hint", "Type the content type name above (the short name used in its address) to list its items.")); return; }
        if (!rs.length) { list.appendChild(el("p", "hh-hint", d && d.success === false ? (d.error || "Could not search.") : "Nothing found. Only published items are listed.")); return; }
        rs.forEach(function (it) {
          var row = el("div", "cs-result");
          if (it.image) { var im = el("img", "cs-thumb"); im.alt = ""; im.src = it.image; im.loading = "lazy"; row.appendChild(im); }
          var tx = el("div", "cs-result__text"); tx.appendChild(el("strong", null, it.title || it.url));
          var sub = it.excerpt || it.url || ""; if (sub) tx.appendChild(el("span", "hh-hint", String(sub).slice(0, 90)));
          row.appendChild(tx);
          var add = btn(links ? "Use" : "Add", "hh-btn", function () {
            if (links) { onPick({ url: it.url, title: it.title }); close.click(); return; }
            var ok = onPick({ source: it.source || src, key: it.key, label: it.title, card: it });
            if (ok === false) { add.textContent = "Full"; add.disabled = true; } else { add.textContent = "Added ✓"; add.disabled = true; }
          });
          row.appendChild(add); list.appendChild(row);
        });
      }).catch(function () { if (mine === seq) { list.textContent = ""; list.appendChild(el("p", "hh-hint", "Could not load results.")); } });
    }
    sources.forEach(function (s, i) {
      var b = btn(s[1], "cs-tab" + (i === 0 ? " is-on" : ""), function () {
        src = s[0]; Array.prototype.forEach.call(tabs.children, function (c) { c.classList.remove("is-on"); }); b.classList.add("is-on");
        extra.textContent = ""; typeIn = null;
        if (src === "custom") { typeIn = el("input"); typeIn.type = "text"; typeIn.placeholder = "Content type, e.g. guides"; typeIn.addEventListener("input", function () { clearTimeout(st); st = setTimeout(run, 300); }); extra.appendChild(typeIn); }
        run();
      });
      b.setAttribute("role", "tab"); tabs.appendChild(b);
    });
    search.addEventListener("input", function () { clearTimeout(st); st = setTimeout(run, 250); });
    box.appendChild(head); box.appendChild(tabs); box.appendChild(search); box.appendChild(extra);
    if (links) {
      var manual = el("div", "cs-row"); var mi = el("input"); mi.type = "text"; mi.placeholder = "…or type an address: /en/page or https://…"; mi.maxLength = 300;
      manual.appendChild(mi); manual.appendChild(btn("Use this address", null, function () { if (mi.value.trim()) { onPick({ url: mi.value.trim() }); close.click(); } }));
      box.appendChild(manual);
    }
    box.appendChild(list); back.appendChild(box);
    back.addEventListener("click", function (e) { if (e.target === back) close.click(); });
    document.body.appendChild(back); search.focus(); run();
  }

  // ------------------------------------------------------------ picked items list
  var cardCache = {};
  function picksIn(o, k, opts) {
    opts = opts || {};
    var max = opts.max || 24;
    var wrap = el("div", "cs-picks");
    var list = el("div", "cs-picklist");
    var add = btn("+ Search and add", "hh-btn", function () {
      openPicker({ sources: opts.sources }, function (p) {
        o[k] = o[k] || [];
        if (o[k].length >= max) return false;
        if (o[k].some(function (x) { return x.source === p.source && x.key === p.key; })) return true;
        o[k].push({ source: p.source, key: p.key, label: p.label }); cardCache[p.source + ":" + p.key] = p.card; commit(); draw(); return true;
      });
    });
    var count = el("span", "hh-hint");
    function move(i, d) { var a = o[k]; var j = i + d; if (j < 0 || j >= a.length) return; var t = a[i]; a[i] = a[j]; a[j] = t; commit(); draw(); }
    function draw() {
      list.textContent = "";
      var a = o[k] = Array.isArray(o[k]) ? o[k] : [];
      if (!a.length) list.appendChild(el("p", "hh-hint", "Nothing picked yet. Use “Search and add”."));
      a.forEach(function (p, i) {
        var row = el("div", "cs-pick");
        var c = cardCache[p.source + ":" + p.key];
        if (c && c.image) { var im = el("img", "cs-thumb"); im.alt = ""; im.src = c.image; row.appendChild(im); }
        var tx = el("div", "cs-result__text"); tx.appendChild(el("strong", null, (c && c.title) || p.label || p.key));
        tx.appendChild(el("span", "hh-hint", (SOURCES.filter(function (s) { return s[0] === p.source; })[0] || [0, p.source])[1] + " · " + p.key)); row.appendChild(tx);
        var acts = el("div", "cs-pick__acts");
        var up = btn("↑", "hh-btn", function () { move(i, -1); }); up.setAttribute("aria-label", "Move up"); up.disabled = i === 0;
        var dn = btn("↓", "hh-btn", function () { move(i, 1); }); dn.setAttribute("aria-label", "Move down"); dn.disabled = i === a.length - 1;
        var rm = btn("Remove", "hh-btn", function () { a.splice(i, 1); commit(); draw(); });
        acts.appendChild(up); acts.appendChild(dn); acts.appendChild(rm); row.appendChild(acts); list.appendChild(row);
      });
      count.textContent = a.length + " of " + max;
    }
    // names and pictures of items picked earlier
    function hydrate() {
      var a = Array.isArray(o[k]) ? o[k] : []; if (!a.length) return;
      fetch("/en/api/v1/component/pick-resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ picks: a }) })
        .then(function (r) { return r.json(); }).then(function (d) { ((d && d.results) || []).forEach(function (c) { cardCache[c.source + ":" + c.key] = c; }); draw(); }).catch(function () {});
    }
    var bar = el("div", "hh-addbar"); bar.appendChild(add); bar.appendChild(count);
    wrap.appendChild(list); wrap.appendChild(bar); draw(); hydrate(); return wrap;
  }

  // ------------------------------------------------------------ generic repeater
  // rows = array of objects; spec = [{k,label,type:'text'|'area'|'link'|'image'|'select',opts,max}]
  function repeaterIn(o, k, spec, max, addLabel, blank, titleOf) {
    var wrap = el("div", "cs-rep"); var list = el("div", "hh-rows");
    var count = el("span", "hh-hint");
    var add = btn(addLabel, "hh-btn", function () { o[k].push(JSON.parse(JSON.stringify(blank))); commit(); draw(); });
    function draw() {
      list.textContent = ""; var a = o[k] = Array.isArray(o[k]) ? o[k] : [];
      a.forEach(function (row, i) {
        var card = el("div", "cs-rowcard");
        var head = el("div", "cs-rowcard__head"); head.appendChild(el("strong", null, (titleOf ? titleOf(row, i) : "") || ("Item " + (i + 1))));
        var acts = el("div", "cs-pick__acts");
        var up = btn("↑", "hh-btn", function () { var t = a[i]; a[i] = a[i - 1]; a[i - 1] = t; commit(); draw(); }); up.disabled = i === 0; up.setAttribute("aria-label", "Move up");
        var dn = btn("↓", "hh-btn", function () { var t = a[i]; a[i] = a[i + 1]; a[i + 1] = t; commit(); draw(); }); dn.disabled = i === a.length - 1; dn.setAttribute("aria-label", "Move down");
        var rm = btn("Remove", "hh-btn", function () { a.splice(i, 1); commit(); draw(); });
        acts.appendChild(up); acts.appendChild(dn); acts.appendChild(rm); head.appendChild(acts); card.appendChild(head);
        spec.forEach(function (f) {
          var c;
          if (f.type === "area") c = textIn(row, f.k, f.ph, f.max, "textarea");
          else if (f.type === "link") c = linkIn(row, f.k);
          else if (f.type === "image") c = imageIn(row, f.k);
          else if (f.type === "select") c = selectIn(row, f.k, f.opts, f.opts[0][0]);
          else c = textIn(row, f.k, f.ph, f.max);
          card.appendChild(field(f.label, f.hint, c));
        });
        list.appendChild(card);
      });
      add.disabled = a.length >= max; count.textContent = a.length + " of " + max;
    }
    var bar = el("div", "hh-addbar"); bar.appendChild(add); bar.appendChild(count);
    wrap.appendChild(list); wrap.appendChild(bar); draw(); return wrap;
  }

  // ------------------------------------------------------------ rich text (visual + HTML)
  var RICH_OK = { P: 1, BR: 1, STRONG: 1, B: 1, EM: 1, I: 1, U: 1, A: 1, UL: 1, OL: 1, LI: 1, H3: 1, H4: 1, BLOCKQUOTE: 1, HR: 1 };
  function onlySimpleMarkup(html) {
    var d = new DOMParser().parseFromString("<body>" + html + "</body>", "text/html");
    var ok = true;
    Array.prototype.forEach.call(d.body.querySelectorAll("*"), function (n) {
      if (!RICH_OK[n.tagName]) ok = false;
      Array.prototype.forEach.call(n.attributes, function (a) { if (!(n.tagName === "A" && a.name === "href")) ok = false; });
    });
    return ok;
  }
  // copy only the simple markup out of what was typed or pasted
  function cleanNode(src, dst) {
    Array.prototype.forEach.call(src.childNodes, function (n) {
      if (n.nodeType === 3) { dst.appendChild(document.createTextNode(n.nodeValue)); return; }
      if (n.nodeType !== 1) return;
      var tag = n.tagName === "DIV" ? "P" : n.tagName;
      if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|SVG|TEMPLATE)$/.test(tag)) return;
      if (!RICH_OK[tag]) { cleanNode(n, dst); return; }
      var c = document.createElement(tag.toLowerCase());
      if (tag === "A") { var h = n.getAttribute("href") || ""; if (/^(https?:\/\/|\/|#|mailto:)/i.test(h)) c.setAttribute("href", h); }
      cleanNode(n, c); dst.appendChild(c);
    });
  }
  function richIn(getHtml, setHtml, opts) {
    opts = opts || {};
    var wrap = el("div", "cs-rich");
    var bar = el("div", "cs-rich__bar");
    var ed = el("div", "cs-rich__ed"); ed.contentEditable = "true"; ed.setAttribute("role", "textbox"); ed.setAttribute("aria-multiline", "true"); ed.setAttribute("aria-label", "Text");
    var code = el("textarea", "cs-rich__code"); code.hidden = true; code.rows = 8;
    var mode = "visual";
    var initial = getHtml() || "";
    var simple = onlySimpleMarkup(initial);
    function loadVisual(html) { ed.textContent = ""; var d = new DOMParser().parseFromString("<body>" + html + "</body>", "text/html"); cleanNode(d.body, ed); }
    function readVisual() { var tmp = document.createElement("div"); cleanNode(ed, tmp); return tmp.innerHTML; }
    function cmd(name, val) { ed.focus(); document.execCommand(name, false, val || null); push(); }
    [["B", "bold", "Bold"], ["I", "italic", "Italic"], ["•", "insertUnorderedList", "Bulleted list"], ["1.", "insertOrderedList", "Numbered list"]].forEach(function (b) {
      var x = btn(b[0], "hh-btn", function () { cmd(b[1]); }); x.setAttribute("aria-label", b[2]); x.title = b[2]; bar.appendChild(x);
    });
    var h = btn("Heading", "hh-btn", function () { cmd("formatBlock", "h3"); }); bar.appendChild(h);
    var pp = btn("Paragraph", "hh-btn", function () { cmd("formatBlock", "p"); }); bar.appendChild(pp);
    var ln = btn("Link", "hh-btn", function () { openPicker({ mode: "link" }, function (it) { cmd("createLink", it.url); }); }); bar.appendChild(ln);
    var tog = btn("Edit as HTML", "hh-btn cs-rich__tog", function () {
      if (mode === "visual") { code.value = readVisual(); ed.hidden = true; code.hidden = false; mode = "html"; tog.textContent = "Back to visual"; }
      else { if (!onlySimpleMarkup(code.value) && !window.confirm("This HTML has parts the visual editor cannot keep (styles, scripts, other tags). Switching will remove them. Continue?")) return; loadVisual(code.value); setHtml(readVisual()); code.hidden = true; ed.hidden = false; mode = "visual"; tog.textContent = "Edit as HTML"; }
    });
    bar.appendChild(tog);
    function push() { setHtml(readVisual()); }
    ed.addEventListener("input", push);
    ed.addEventListener("paste", function (e) {
      e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData("text/plain"); document.execCommand("insertText", false, t);
    });
    code.addEventListener("input", function () { setHtml(code.value); });
    wrap.appendChild(bar); wrap.appendChild(ed); wrap.appendChild(code);
    if (!simple) {
      // keep existing markup exactly as it is until the admin chooses to change it
      code.value = initial; ed.hidden = true; code.hidden = false; mode = "html"; tog.textContent = "Back to visual";
      wrap.insertBefore(el("p", "hh-hint", "This text uses HTML the visual editor cannot keep, so it is shown as HTML and left exactly as it is."), bar);
    } else loadVisual(initial);
    return wrap;
  }

  // ------------------------------------------------------------ type forms
  var builders = {};

  builders.text = function (root) {
    var g = group("Text", "Write it like a document", true); root.appendChild(g);
    g.body.appendChild(field(null, "Bold, lists, links and headings. “Edit as HTML” is for developers.", richIn(function () { return contentEl.value; }, function (h) { setContent(h); }), true));
  };

  builders.cta = function (root) {
    var g = group("Call to action", "Text and button", true); root.appendChild(g);
    var c = { v: contentEl.value };
    g.body.appendChild(field("Text", null, (function () { var t = el("textarea"); t.rows = 3; t.value = contentEl.value; t.addEventListener("input", function () { setContent(t.value); }); return t; })(), true));
    g.body.appendChild(field("Button text", null, textIn(S, "button_text", "Click here", 40)));
    g.body.appendChild(field("Button link", null, linkIn(S, "link")));
  };
  builders.banner = function (root) { builders.cta(root); root.firstChild.querySelector("summary").firstChild.nodeValue = "Banner"; };

  builders.faq_group = function (root) {
    var g = group("Questions and answers", "Add as many as you need", true); root.appendChild(g);
    var box = { items: [] };
    try { var v = JSON.parse(contentEl.value || "[]"); if (Array.isArray(v)) box.items = v.filter(isObj).map(function (r) { var o2 = {}; Object.keys(r).forEach(function (k2) { o2[k2] = r[k2]; }); return o2; }); } catch (e) { box.items = []; }
    var origBlank = contentEl.value && !box.items.length && contentEl.value.trim() !== "[]";
    if (origBlank) g.body.appendChild(el("p", "hh-hint", "The existing content is not a list of questions, so it is left as it is until you add a question here."));
    var rep = repeaterIn(box, "items", [{ k: "q", label: "Question", max: 300 }, { k: "a", label: "Answer", type: "area", max: 2000 }], 40, "+ Add question", { q: "", a: "" }, function (r, i) { return r.q || "Question " + (i + 1); });
    // write on every change
    var write = function () { setContent(JSON.stringify(box.items.filter(function (r) { return r.q || r.a; }))); };
    rep.addEventListener("input", write); rep.addEventListener("click", function () { setTimeout(write, 0); });
    g.body.appendChild(rep);
  };

  builders.author = function (root) {
    var g = group("Author", "Pick an author or fill in the details", true); root.appendChild(g);
    var a = parseObj(contentEl.value);
    function write() { setContent(JSON.stringify(a)); }
    var pick = btn("Pick an existing author", "hh-btn", function () {
      openPicker({ sources: [["author", "Authors"]] }, function (p) {
        var c = p.card || {};
        a.name = c.title || a.name || ""; if (c.excerpt) a.bio = c.excerpt; if (c.image) a.avatar = c.image;
        write(); g.body.textContent = ""; fill(); return true;
      });
    });
    function fill() {
      g.body.appendChild(pick);
      var wrapper = { get name() { return a.name; } };
      g.body.appendChild(field("Name", null, (function () { var i = textIn(a, "name", "Full name", 120); i.addEventListener("input", write); return i; })()));
      g.body.appendChild(field("Role / title", null, (function () { var i = textIn(a, "title", "Founder", 120); i.addEventListener("input", write); return i; })()));
      g.body.appendChild(field("Short bio", null, (function () { var i = textIn(a, "bio", "A few sentences", 600, "textarea"); i.addEventListener("input", write); return i; })(), true));
      var img = imageIn(a, "avatar", "Choose a photo"); img.addEventListener("input", write); img.addEventListener("click", function () { setTimeout(write, 0); });
      g.body.appendChild(field("Photo", null, img, true));
    }
    fill();
  };

  function limitForm(label, hint) {
    return function (root) {
      var g = group(label, "How many to show", true); root.appendChild(g);
      g.body.appendChild(field("Number to show", hint, numIn(S, "limit", 1, 50, 6)));
      g.body.appendChild(el("p", "hh-hint", "What is shown is chosen automatically by the site. For a hand-picked list, use the “Content grid” type."));
    };
  }
  builders.casino_grid = limitForm("Casino grid", "The best-rated casinos, newest first on ties.");
  builders.comparison_table = limitForm("Comparison table", "Rows in the table.");
  builders.news_feed = limitForm("News feed", "The newest articles.");

  // ---- content grid
  function gridForm(root) {
    var d = { mode: "picked", columns: 3, limit: 6, style: "card", ratio: "wide", latest_source: "news", latest_sort: "newest" };
    Object.keys(d).forEach(function (k) { if (S[k] == null) S[k] = d[k]; });
    var src = group("What to show", "Pick items, or use the newest automatically", true); root.appendChild(src);
    var pickedBox = el("div"); var latestBox = el("div");
    function sync() { pickedBox.hidden = S.mode !== "picked"; latestBox.hidden = S.mode !== "latest"; }
    src.body.appendChild(field("Fill the grid", null, segIn(S, "mode", [["picked", "Items I pick"], ["latest", "Newest automatically"]], "picked", sync), true));
    pickedBox.appendChild(field("Items (casinos, news, research, authors, updates, pictures and more)", "You can mix kinds. Reorder with the arrows.", picksIn(S, "items", { max: 24 }), true));
    latestBox.appendChild(field("Show the newest", null, (function () {
      var s = el("select"); SOURCES.filter(function (x) { return x[0] !== "media" && x[0] !== "author"; }).concat([["author", "Authors"]]).forEach(function (p) { var op = el("option", null, p[1]); op.value = p[0]; s.appendChild(op); });
      s.value = S.latest_source; s.addEventListener("change", function () { S.latest_source = s.value; S.latest_type = ""; commit(); typeRow(); }); return s;
    })()));
    var typeHost = el("div");
    function typeRow() {
      typeHost.textContent = "";
      if (S.latest_source === "research") typeHost.appendChild(field("Research type (optional)", null, selectIn(S, "latest_type", [["", "All types"]].concat(RESEARCH_TYPES.map(function (t) { return [t, t.charAt(0).toUpperCase() + t.slice(1)]; })), "")));
      else if (S.latest_source === "custom") typeHost.appendChild(field("Content type", "The short name used in its address.", textIn(S, "latest_type", "guides", 60)));
    }
    typeRow(); latestBox.appendChild(typeHost);
    latestBox.appendChild(field("Order", null, selectIn(S, "latest_sort", [["newest", "Newest first"], ["rating", "Best rating first"], ["name", "A to Z"]], "newest")));
    latestBox.appendChild(field("How many", null, numIn(S, "limit", 1, 24, 6)));
    src.body.appendChild(pickedBox); src.body.appendChild(latestBox); sync();

    var lay = group("Layout", "Columns, card style, picture shape"); root.appendChild(lay);
    lay.body.appendChild(field("Columns (wide screens)", null, segIn(S, "columns", [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]], "3", null)));
    // numeric values for the seg
    lay.body.lastChild.querySelectorAll("input").forEach(function (i) { i.addEventListener("change", function () { S.columns = parseInt(i.value, 10); commit(); }); });
    lay.body.appendChild(field("Card style", null, segIn(S, "style", [["card", "Card"], ["compact", "Compact"], ["list", "List"], ["overlay", "Picture overlay"]], "card")));
    lay.body.appendChild(field("Picture shape", null, segIn(S, "ratio", [["wide", "Wide"], ["standard", "Standard"], ["square", "Square"], ["auto", "Natural"]], "wide")));
    lay.body.appendChild(field("Text alignment", null, segIn(S, "align", [["left", "Left"], ["center", "Centre"]], "left")));
    lay.body.appendChild(field("Background", null, segIn(S, "bg", [["none", "None"], ["soft", "Soft"], ["dark", "Dark"]], "none")));

    var show = group("What each card shows", "Picture, rating, bonus, button…"); root.appendChild(show);
    [["show_image", "Picture", true], ["show_badge", "Badge (e.g. category)", true], ["show_rating", "Star rating", true], ["show_bonus", "Bonus line (casinos)", true], ["show_excerpt", "Short description", true], ["show_date", "Date", false], ["show_button", "Button", true]].forEach(function (s) { show.body.appendChild(field(null, null, switchIn(S, s[0], s[1], s[2]))); });
    show.body.appendChild(field("Button text (optional)", "Leave empty for “Read review”, “Read more”…", textIn(S, "button_text", "Read more", 30)));

    var more = group("Heading and “see all” link", "Optional"); root.appendChild(more);
    more.body.appendChild(field("Intro text under the title", "The title above is the component’s Title.", textIn(S, "intro", "A short line", 300, "textarea"), true));
    more.body.appendChild(field("“See all” text", null, textIn(S, "more_text", "See all casinos", 40)));
    more.body.appendChild(field("“See all” link", null, linkIn(S, "more_url")));
  }
  builders.content_grid = gridForm;

  // ---- data table
  function tableForm(root) {
    var d = { mode: "manual", style: "striped", header: "dark", casino_source: "picked", limit: 5 };
    Object.keys(d).forEach(function (k) { if (S[k] == null) S[k] = d[k]; });
    if (!Array.isArray(S.columns) || !S.columns.length) S.columns = [{ label: "Name", align: "left" }, { label: "Details", align: "left" }];
    S.columns = S.columns.map(function (c) { return isObj(c) ? c : { label: String(c || ""), align: "left" }; });
    if (!Array.isArray(S.rows)) S.rows = [];
    if (!S.rows.length) S.rows = [[{ t: "" }, { t: "" }], [{ t: "" }, { t: "" }]];
    var g = group("Table content", "Type your own, or build a casino comparison", true); root.appendChild(g);
    var manual = el("div"), casinos = el("div");
    function sync() { manual.hidden = S.mode !== "manual"; casinos.hidden = S.mode !== "casinos"; }
    g.body.appendChild(field("Kind of table", null, segIn(S, "mode", [["manual", "My own table"], ["casinos", "Casino comparison"]], "manual", sync), true));
    // manual grid
    var gridHost = el("div", "cs-grid-host");
    function norm() { S.rows.forEach(function (r, i) { while (r.length < S.columns.length) r.push({ t: "" }); S.rows[i] = r.slice(0, S.columns.length).map(function (c) { return isObj(c) ? c : { t: String(c == null ? "" : c) }; }); }); }
    function draw() {
      norm(); gridHost.textContent = "";
      var tbl = el("table", "cs-grid"); var thead = el("thead"); var hr = el("tr");
      S.columns.forEach(function (c, ci) {
        var th = el("th"); var i = el("input"); i.type = "text"; i.value = c.label; i.placeholder = "Column " + (ci + 1); i.maxLength = 60; i.setAttribute("aria-label", "Column " + (ci + 1) + " heading");
        i.addEventListener("input", function () { c.label = i.value; commit(); });
        var al = el("select"); [["left", "Left"], ["center", "Centre"], ["right", "Right"]].forEach(function (p) { var op = el("option", null, p[1]); op.value = p[0]; al.appendChild(op); }); al.value = c.align || "left"; al.setAttribute("aria-label", "Column " + (ci + 1) + " alignment");
        al.addEventListener("change", function () { c.align = al.value; commit(); });
        var rm = btn("×", "hh-btn", function () { if (S.columns.length > 1) { S.columns.splice(ci, 1); S.rows.forEach(function (r) { r.splice(ci, 1); }); commit(); draw(); } }); rm.setAttribute("aria-label", "Remove column"); rm.disabled = S.columns.length <= 1;
        th.appendChild(i); th.appendChild(al); th.appendChild(rm); hr.appendChild(th);
      });
      hr.appendChild(el("th")); thead.appendChild(hr); tbl.appendChild(thead);
      var tb = el("tbody");
      S.rows.forEach(function (r, ri) {
        var tr = el("tr");
        r.forEach(function (cell, ci) {
          var td = el("td"); var i = el("input"); i.type = "text"; i.value = cell.t || ""; i.maxLength = 300; i.setAttribute("aria-label", "Row " + (ri + 1) + ", " + (S.columns[ci].label || "column " + (ci + 1)));
          i.addEventListener("input", function () { cell.t = i.value; commit(); });
          var lk = btn(cell.l ? "🔗" : "link", "hh-btn cs-cell-link", function () { openPicker({ mode: "link" }, function (it) { cell.l = it.url; commit(); draw(); }); });
          lk.title = cell.l ? "Linked to " + cell.l + " (click to change)" : "Add a link";
          td.appendChild(i); td.appendChild(lk);
          if (cell.l) { var cl = btn("×", "hh-btn cs-cell-link", function () { delete cell.l; commit(); draw(); }); cl.setAttribute("aria-label", "Remove link"); td.appendChild(cl); }
          tr.appendChild(td);
        });
        var ac = el("td", "cs-grid__acts");
        var up = btn("↑", "hh-btn", function () { var t = S.rows[ri]; S.rows[ri] = S.rows[ri - 1]; S.rows[ri - 1] = t; commit(); draw(); }); up.disabled = ri === 0; up.setAttribute("aria-label", "Move row up");
        var dn = btn("↓", "hh-btn", function () { var t = S.rows[ri]; S.rows[ri] = S.rows[ri + 1]; S.rows[ri + 1] = t; commit(); draw(); }); dn.disabled = ri === S.rows.length - 1; dn.setAttribute("aria-label", "Move row down");
        var rm = btn("×", "hh-btn", function () { S.rows.splice(ri, 1); commit(); draw(); }); rm.setAttribute("aria-label", "Remove row");
        ac.appendChild(up); ac.appendChild(dn); ac.appendChild(rm); tr.appendChild(ac); tb.appendChild(tr);
      });
      tbl.appendChild(tb);
      var sc = el("div", "cs-grid-scroll"); sc.appendChild(tbl); gridHost.appendChild(sc);
      var bar = el("div", "hh-addbar");
      var ar = btn("+ Add row", "hh-btn", function () { S.rows.push(S.columns.map(function () { return { t: "" }; })); commit(); draw(); }); ar.disabled = S.rows.length >= 60;
      var ac2 = btn("+ Add column", "hh-btn", function () { if (S.columns.length < 8) { S.columns.push({ label: "", align: "left" }); S.rows.forEach(function (r) { r.push({ t: "" }); }); commit(); draw(); } }); ac2.disabled = S.columns.length >= 8;
      bar.appendChild(ar); bar.appendChild(ac2); bar.appendChild(el("span", "hh-hint", S.rows.length + " rows, " + S.columns.length + " columns (up to 60 and 8)")); gridHost.appendChild(bar);
    }
    manual.appendChild(gridHost); draw();
    manual.appendChild(field(null, null, switchIn(S, "first_col_bold", "Make the first column a row heading", true)));
    // casinos
    casinos.appendChild(field("Which casinos", null, segIn(S, "casino_source", [["picked", "Casinos I pick"], ["latest", "Top rated automatically"]], "picked", sync2), true));
    var cp = el("div"); cp.appendChild(field("Casinos", "Reorder with the arrows.", picksIn(S, "items", { max: 24, sources: [["casino", "Casinos"]] }), true));
    var cl = el("div"); cl.appendChild(field("How many", null, numIn(S, "limit", 1, 24, 5)));
    function sync2() { cp.hidden = S.casino_source !== "picked"; cl.hidden = S.casino_source !== "latest"; }
    casinos.appendChild(cp); casinos.appendChild(cl); sync2();
    var cols = el("div", "hh-field hh-wide"); cols.appendChild(el("span", "hh-label", "Columns to show"));
    if (!Array.isArray(S.casino_cols)) S.casino_cols = ["name", "rating", "bonus", "button"];
    [["name", "Casino name"], ["rating", "Rating"], ["bonus", "Bonus"], ["license", "Licence"], ["button", "Visit button"]].forEach(function (p) {
      var l = el("label", "hh-switch"); var i = el("input"); i.type = "checkbox"; i.checked = S.casino_cols.indexOf(p[0]) !== -1;
      i.addEventListener("change", function () { var s = S.casino_cols.filter(function (x) { return x !== p[0]; }); if (i.checked) s.push(p[0]); S.casino_cols = s; commit(); });
      l.appendChild(i); var tr2 = el("span", "hh-track"); tr2.setAttribute("aria-hidden", "true"); l.appendChild(tr2); l.appendChild(el("span", null, p[1])); cols.appendChild(l);
    });
    casinos.appendChild(cols);
    casinos.appendChild(field("Button text", null, textIn(S, "button_text", "Visit", 30)));
    g.body.appendChild(manual); g.body.appendChild(casinos); sync();

    var look = group("Look", "Style, header colour, caption"); root.appendChild(look);
    look.body.appendChild(field("Style", null, segIn(S, "style", [["default", "Plain"], ["striped", "Striped"], ["bordered", "Bordered"]], "striped")));
    look.body.appendChild(field("Header row", null, segIn(S, "header", [["dark", "Dark"], ["brand", "Brand colour"], ["light", "Light"]], "dark")));
    look.body.appendChild(field(null, null, switchIn(S, "compact", "Compact (less spacing)", false)));
    look.body.appendChild(field("Caption (read by screen readers and shown above)", null, textIn(S, "caption", "Optional", 160)));
    look.body.appendChild(field("Note under the table", null, textIn(S, "note", "e.g. Updated monthly", 300, "textarea"), true));
  }
  builders.data_table = tableForm;

  // ---- section
  var BLOCKS = [["heading", "Heading"], ["text", "Text"], ["image", "Picture"], ["button", "Button"], ["list", "List"], ["video", "Video"], ["features", "Feature cards"], ["stats", "Numbers"], ["spacer", "Space"], ["divider", "Line"]];
  var BLANK = {
    heading: { type: "heading", text: "", level: "h2", col: 1 }, text: { type: "text", html: "", col: 1 }, image: { type: "image", src: "", alt: "", link: "", size: "full", rounded: true, caption: "", col: 1 },
    button: { type: "button", text: "", link: "", style: "primary", new_tab: false, col: 1 }, list: { type: "list", items: [{ t: "" }], style: "check", col: 1 },
    video: { type: "video", url: "", poster: "", text: "Watch video", col: 1 }, features: { type: "features", items: [{ icon: "", title: "", text: "" }], col: 1 },
    stats: { type: "stats", items: [{ value: "", label: "" }], col: 1 }, spacer: { type: "spacer", size: "md", col: 1 }, divider: { type: "divider", col: 1 }
  };
  function sectionForm(root) {
    var d = { bg: "none", pad: "md", width: "normal", align: "left", cols: 1, gap: "md", valign: "top", overlay: 45 };
    Object.keys(d).forEach(function (k) { if (S[k] == null) S[k] = d[k]; });
    if (!Array.isArray(S.blocks)) S.blocks = [];
    var look = group("Look of the section", "Background, spacing, width"); root.appendChild(look);
    var colorBox = el("div"), imgBox = el("div");
    function sync() { colorBox.hidden = S.bg !== "color"; imgBox.hidden = S.bg !== "image"; }
    look.body.appendChild(field("Background", null, segIn(S, "bg", [["none", "None"], ["soft", "Soft grey"], ["dark", "Dark"], ["brand", "Brand colour"], ["color", "My colour"], ["image", "Picture"]], "none", sync), true));
    colorBox.appendChild(field("Background colour", null, colorIn(S, "bg_color")));
    imgBox.appendChild(field("Background picture", null, imageIn(S, "bg_image"), true));
    imgBox.appendChild(field("Darkening over the picture", null, rangeIn(S, "overlay", 0, 85, 5, 45, "%")));
    look.body.appendChild(colorBox); look.body.appendChild(imgBox); sync();
    look.body.appendChild(field("Text colour (optional)", "Leave on Default for automatic.", colorIn(S, "text_color")));
    look.body.appendChild(field("Space above and below", null, segIn(S, "pad", [["sm", "Small"], ["md", "Medium"], ["lg", "Large"], ["xl", "Extra large"]], "md")));
    look.body.appendChild(field("Content width", null, segIn(S, "width", [["narrow", "Narrow"], ["normal", "Normal"], ["wide", "Wide"], ["full", "Full"]], "normal")));
    look.body.appendChild(field("Text alignment", null, segIn(S, "align", [["left", "Left"], ["center", "Centre"], ["right", "Right"]], "left")));
    look.body.appendChild(field(null, null, switchIn(S, "rounded", "Rounded corners", false)));
    look.body.appendChild(field("Anchor name (optional)", "Lets a link jump here, e.g. “bonuses” → /en/page#bonuses.", textIn(S, "anchor", "bonuses", 40)));

    var lay = group("Columns", "Put content side by side"); root.appendChild(lay);
    lay.body.appendChild(field("Columns", null, segIn(S, "cols", [["1", "1"], ["2", "2"], ["3", "3"]], "1", function () { rebuildBlocks(); })));
    lay.body.lastChild.querySelectorAll("input").forEach(function (i) { i.addEventListener("change", function () { S.cols = parseInt(i.value, 10); commit(); rebuildBlocks(); }); });
    lay.body.appendChild(field("Gap between columns", null, segIn(S, "gap", [["sm", "Small"], ["md", "Medium"], ["lg", "Large"]], "md")));
    lay.body.appendChild(field("Vertical alignment", null, segIn(S, "valign", [["top", "Top"], ["center", "Centre"]], "top")));

    var bl = group("Content blocks", "Build the section from blocks", true); root.appendChild(bl);
    var host = el("div", "cs-blocks"); bl.body.appendChild(host);
    var bar = el("div", "cs-blockbar"); bar.appendChild(el("span", "hh-label", "Add a block:"));
    BLOCKS.forEach(function (b) { bar.appendChild(btn("+ " + b[1], "hh-btn", function () { if (S.blocks.length >= 30) return; var nb = JSON.parse(JSON.stringify(BLANK[b[0]])); S.blocks.push(nb); commit(); rebuildBlocks(); })); });
    bl.body.appendChild(bar);
    function rebuildBlocks() {
      host.textContent = "";
      if (!S.blocks.length) host.appendChild(el("p", "hh-hint", "No blocks yet. Add a heading, text, picture, button…"));
      S.blocks.forEach(function (b, i) {
        var card = el("details", "cs-block"); card.open = true;
        var sm = el("summary"); sm.appendChild(el("strong", null, (BLOCKS.filter(function (x) { return x[0] === b.type; })[0] || [0, b.type])[1]));
        var prev = b.text || b.url || (b.html ? b.html.replace(/<[^>]*>/g, " ").trim().slice(0, 40) : "") || ""; if (prev) sm.appendChild(el("span", "hh-sub", String(prev).slice(0, 40)));
        card.appendChild(sm);
        var acts = el("div", "cs-pick__acts");
        if (S.cols > 1) { var cs = el("select"); cs.setAttribute("aria-label", "Column"); for (var c = 1; c <= S.cols; c++) { var op = el("option", null, "Column " + c); op.value = c; cs.appendChild(op); } cs.value = Math.min(b.col || 1, S.cols); cs.addEventListener("change", function () { b.col = parseInt(cs.value, 10); commit(); }); acts.appendChild(cs); }
        var up = btn("↑", "hh-btn", function () { var t = S.blocks[i]; S.blocks[i] = S.blocks[i - 1]; S.blocks[i - 1] = t; commit(); rebuildBlocks(); }); up.disabled = i === 0; up.setAttribute("aria-label", "Move up");
        var dn = btn("↓", "hh-btn", function () { var t = S.blocks[i]; S.blocks[i] = S.blocks[i + 1]; S.blocks[i + 1] = t; commit(); rebuildBlocks(); }); dn.disabled = i === S.blocks.length - 1; dn.setAttribute("aria-label", "Move down");
        var rm = btn("Remove", "hh-btn", function () { S.blocks.splice(i, 1); commit(); rebuildBlocks(); });
        acts.appendChild(up); acts.appendChild(dn); acts.appendChild(rm); card.appendChild(acts);
        var inner = el("div", "cs-block__body"); blockFields(inner, b); card.appendChild(inner); host.appendChild(card);
      });
    }
    rebuildBlocksRef = rebuildBlocks;
    rebuildBlocks();
  }
  var rebuildBlocksRef = null;
  function blockFields(root, b) {
    switch (b.type) {
      case "heading":
        root.appendChild(field("Heading", null, textIn(b, "text", "Heading", 160)));
        root.appendChild(field("Size", null, segIn(b, "level", [["h2", "Large"], ["h3", "Medium"], ["h4", "Small"]], "h2"))); break;
      case "text":
        root.appendChild(field(null, null, richIn(function () { return b.html || ""; }, function (h) { b.html = h; commit(); }), true)); break;
      case "image":
        root.appendChild(field("Picture", null, imageIn(b, "src"), true));
        root.appendChild(field("Description for screen readers", null, textIn(b, "alt", "What the picture shows", 140)));
        root.appendChild(field("Caption", null, textIn(b, "caption", "Optional", 120)));
        root.appendChild(field("Link (optional)", null, linkIn(b, "link")));
        root.appendChild(field("Size", null, segIn(b, "size", [["small", "Small"], ["medium", "Medium"], ["large", "Large"], ["full", "Full width"]], "full")));
        root.appendChild(field(null, null, switchIn(b, "rounded", "Rounded corners", true))); break;
      case "button":
        root.appendChild(field("Button text", null, textIn(b, "text", "Play now", 40)));
        root.appendChild(field("Link", null, linkIn(b, "link")));
        root.appendChild(field("Style", null, segIn(b, "style", [["primary", "Solid"], ["ghost", "Outline"]], "primary")));
        root.appendChild(field(null, null, switchIn(b, "new_tab", "Open in a new tab", false))); break;
      case "list":
        root.appendChild(field("Style", null, segIn(b, "style", [["check", "Ticks"], ["bullet", "Bullets"], ["number", "Numbers"]], "check")));
        root.appendChild(field("Items", null, repeaterIn(b, "items", [{ k: "t", label: "Text", max: 200 }], 12, "+ Add item", { t: "" }, function (r) { return r.t; }), true)); break;
      case "video":
        root.appendChild(field("YouTube or Vimeo link", "Opens in a pop-up. Nothing loads from those sites until it is clicked.", textIn(b, "url", "https://www.youtube.com/watch?v=…", 300), true));
        root.appendChild(field("Cover picture (optional)", null, imageIn(b, "poster"), true));
        root.appendChild(field("Button text", null, textIn(b, "text", "Watch video", 40))); break;
      case "features":
        root.appendChild(field("Cards (up to 8)", null, repeaterIn(b, "items", [{ k: "icon", label: "Icon (an emoji)", max: 8 }, { k: "title", label: "Title", max: 80 }, { k: "text", label: "Text", type: "area", max: 240 }], 8, "+ Add card", { icon: "", title: "", text: "" }, function (r) { return r.title; }), true)); break;
      case "stats":
        root.appendChild(field("Numbers (up to 6)", null, repeaterIn(b, "items", [{ k: "value", label: "Number or value", ph: "250+", max: 20 }, { k: "label", label: "Label", ph: "Casinos reviewed", max: 60 }], 6, "+ Add number", { value: "", label: "" }, function (r) { return r.value; }), true)); break;
      case "spacer":
        root.appendChild(field("Size", null, segIn(b, "size", [["sm", "Small"], ["md", "Medium"], ["lg", "Large"]], "md"))); break;
      default: root.appendChild(el("p", "hh-hint", "No options."));
    }
  }
  builders.section = sectionForm;

  // ------------------------------------------------------------ build / sync
  function usesForm(type) { return FORM_TYPES.indexOf(type) !== -1; }
  function build() {
    var type = typeSel.value; current = type;
    body.textContent = "";
    var on = usesForm(type);
    panel.hidden = !on;
    // raw boxes: hidden behind "Advanced" when a form exists; always the title row stays
    contentGroup.hidden = on && !advToggle.checked;
    settingsGroup.hidden = on && !advToggle.checked;
    if (type === "hero") { contentGroup.hidden = false; settingsGroup.hidden = false; }
    previewBox.hidden = NEW_TYPES.indexOf(type) === -1;
    if (!on) return;
    S = parseObj(settingsEl.value);
    // a settings box that held something that is not an object is left alone until the form changes it
    busy = true;
    try { builders[type](body); } finally { busy = false; }
    schedulePreview();
  }

  // ------------------------------------------------------------ preview
  function wrapDoc(html) {
    var css = ["main", "responsive", "supportive", "header-hero", "component-blocks"].map(function (n) { return '<link rel="stylesheet" href="' + location.origin + "/static/css/" + n + '.css">'; }).join("");
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank">' + css +
      '<style>body{margin:0;padding:16px;background:#fff}</style></head><body><div class="container" style="max-width:1100px;margin:0 auto">' + html + '</div></body></html>';
  }
  function schedulePreview() {
    if (previewBox.hidden || panel.hidden) return;
    window.clearTimeout(timer); timer = window.setTimeout(preview, 450);
  }
  function preview() {
    var mine = ++ticket;
    fetch("/en/api/v1/component/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: typeSel.value, title: titleEl.value, settings_json: settingsEl.value }) })
      .then(function (r) { return r.json(); }).then(function (d) {
        if (mine !== ticket) return;
        if (d && d.success) { frame.srcdoc = wrapDoc(d.html || '<p style="color:#64748b;font:14px sans-serif">Nothing to show yet. Add content on the left.</p>'); previewNote.textContent = "The preview uses the site styles and your saved content."; }
        else previewNote.textContent = (d && d.error) || "The preview could not be built.";
      }).catch(function () { if (mine === ticket) previewNote.textContent = "The preview could not be loaded."; });
  }
  Array.prototype.forEach.call(panel.querySelectorAll('[name="cs_device"]'), function (r) {
    r.addEventListener("change", function () {
      var phone = panel.querySelector('[name="cs_device"]:checked').value === "mobile";
      frame.style.width = phone ? "390px" : "100%"; frame.style.height = phone ? "620px" : "480px";
    });
  });
  titleEl.addEventListener("input", schedulePreview);

  // ------------------------------------------------------------ events
  typeSel.addEventListener("change", function () {
    // options of a grid, table or section mean nothing to another type: start that type fresh
    if (current !== typeSel.value && (NEW_TYPES.indexOf(current) !== -1 || NEW_TYPES.indexOf(typeSel.value) !== -1)) settingsEl.value = "";
    build();
  });
  advToggle.addEventListener("change", function () { build(); });
  form.addEventListener("component:loaded", function () { build(); });
  form.addEventListener("reset", function () { window.setTimeout(build, 0); });
  // developers editing the raw boxes: the form follows
  var rawTimer = null;
  function rawChanged() { if (!advToggle.checked) return; window.clearTimeout(rawTimer); rawTimer = window.setTimeout(build, 600); }
  settingsEl.addEventListener("input", rawChanged); contentEl.addEventListener("input", function (e) { if (e.isTrusted) rawChanged(); });
  // a form that would send a non-object Settings box is stopped here with a clear message
  form.addEventListener("submit", function (e) {
    if (!usesForm(typeSel.value)) return;
    var v = settingsEl.value.trim();
    if (v) { try { if (!isObj(JSON.parse(v))) throw 0; } catch (err) { e.preventDefault(); e.stopImmediatePropagation(); window.alert("The advanced Settings box is not valid. Fix it or clear it."); } }
  }, true);

  window.addEventListener("DOMContentLoaded", build);
  if (document.readyState !== "loading") build();
})();
