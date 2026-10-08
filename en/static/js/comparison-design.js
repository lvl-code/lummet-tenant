// =====================================================
// COMPARISON DESIGN EDITOR (dashboard)
// Colours and fonts for the whole table, for each item (column) and for each row, plus
// custom values: a grid with one row per criterion and one box per chosen item.
// An empty colour or value means "use the site's look / the real data".
// Mounted by dashboard.js on the comparison create and edit forms.
// =====================================================

(function () {
  "use strict";

  var PAGE_COLORS = [["head_bg", "Header background"], ["head_text", "Header text"], ["label_bg", "Label column background"], ["label_text", "Label text"], ["cell_bg", "Cell background"], ["cell_text", "Cell text"], ["stripe_bg", "Alternate row background"], ["border", "Lines"], ["accent", "Highlight (Best, Our pick)"]];
  var ITEM_COLORS = [["head_bg", "Header background"], ["head_text", "Header text"], ["col_bg", "Column background"], ["col_text", "Column text"], ["accent", "Highlight"]];
  var ROW_COLORS = [["label_bg", "Label background"], ["label_text", "Label text"], ["cell_bg", "Cell background"], ["cell_text", "Cell text"]];
  var FONTS = [["site", "Site font"], ["serif", "Serif (Georgia)"], ["elegant", "Elegant (Palatino)"], ["rounded", "Rounded (Trebuchet)"], ["classic", "Classic (Verdana)"], ["mono", "Monospace"]];
  var SIZES = [["md", "Normal"], ["sm", "Small"], ["lg", "Large"]];
  var RADII = [["md", "Rounded"], ["sq", "Square"], ["lg", "Very round"]];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function mount(opts) {
    var root = opts.container;
    if (!root) return null;
    var state = { page: {}, items: {}, rows: {}, cells: {} };
    var timer;

    function itemKey(it) { return it.itemContentType + ":" + it.itemId; }
    function shortName(it) { return String(it.label || "").replace(/\s*\(.*$/, "") || itemKey(it); }
    function bag(group, key) { if (!state[group][key]) state[group][key] = {}; return state[group][key]; }
    function tidy(group, key) { if (state[group][key] && !Object.keys(state[group][key]).length) delete state[group][key]; }

    function colorField(label, get, set) {
      var wrap = el("label", "cd-color");
      var input = document.createElement("input");
      input.type = "color";
      var cur = get();
      input.value = cur || "#888888";
      wrap.classList.toggle("cd-unset", !cur);
      var clear = el("button", "cd-clear", "×");
      clear.type = "button";
      clear.title = "Use the site colour";
      clear.hidden = !cur;
      input.addEventListener("input", function () { set(input.value); wrap.classList.remove("cd-unset"); clear.hidden = false; });
      clear.addEventListener("click", function (e) { e.preventDefault(); set(""); input.value = "#888888"; wrap.classList.add("cd-unset"); clear.hidden = true; });
      wrap.appendChild(el("span", "cd-color__label", label));
      wrap.appendChild(input);
      wrap.appendChild(clear);
      return wrap;
    }

    function selectField(label, options, get, set) {
      var wrap = el("label", "cd-select");
      wrap.appendChild(el("span", "cd-color__label", label));
      var sel = document.createElement("select");
      options.forEach(function (o) { var opt = document.createElement("option"); opt.value = o[0]; opt.textContent = o[1]; sel.appendChild(opt); });
      sel.value = get() || options[0][0];
      sel.addEventListener("change", function () { set(sel.value === options[0][0] ? "" : sel.value); });
      wrap.appendChild(sel);
      return wrap;
    }

    function setIn(group, key, name, value) {
      var b = bag(group, key);
      if (value) b[name] = value; else delete b[name];
      tidy(group, key);
    }

    function section(title, open) {
      var d = document.createElement("details");
      d.className = "cd-section";
      d.open = !!open;
      d.appendChild(el("summary", "", title));
      return d;
    }

    function render() {
      var items = opts.getItems() || [];
      var criteria = opts.getCriteria() || [];
      root.innerHTML = "";

      // whole table
      var s1 = section("Whole table: colours and fonts", true);
      var g1 = el("div", "cd-grid");
      PAGE_COLORS.forEach(function (c) {
        g1.appendChild(colorField(c[1], function () { return state.page[c[0]]; }, function (v) { if (v) state.page[c[0]] = v; else delete state.page[c[0]]; }));
      });
      g1.appendChild(selectField("Font", FONTS, function () { return state.page.font; }, function (v) { if (v) state.page.font = v; else delete state.page.font; }));
      g1.appendChild(selectField("Text size", SIZES, function () { return state.page.size; }, function (v) { if (v) state.page.size = v; else delete state.page.size; }));
      g1.appendChild(selectField("Corners", RADII, function () { return state.page.radius; }, function (v) { if (v) state.page.radius = v; else delete state.page.radius; }));
      s1.appendChild(g1);
      root.appendChild(s1);

      // each item
      var s2 = section("Each item (column)", false);
      if (!items.length) s2.appendChild(el("p", "muted", "Add items to compare first."));
      items.forEach(function (it) {
        var k = itemKey(it);
        var box = el("div", "cd-item");
        box.appendChild(el("strong", "", shortName(it)));
        var g = el("div", "cd-grid");
        ITEM_COLORS.forEach(function (c) {
          g.appendChild(colorField(c[1], function () { return (state.items[k] || {})[c[0]]; }, function (v) { setIn("items", k, c[0], v); }));
        });
        g.appendChild(selectField("Font", FONTS, function () { return (state.items[k] || {}).font; }, function (v) { setIn("items", k, "font", v); }));
        box.appendChild(g);
        s2.appendChild(box);
      });
      root.appendChild(s2);

      // rows and custom values
      var s3 = section("Rows and custom values", true);
      s3.appendChild(el("p", "muted", "One row for each criterion above, one box for each item. Type your own value to replace the real one for that item; leave it empty to keep the real value. Custom rows (add one below) are filled the same way."));
      if (!criteria.length || !items.length) {
        s3.appendChild(el("p", "muted", "Add at least one item and one criterion to fill values."));
      } else {
        var wrap = el("div", "cd-table-wrap");
        var table = el("table", "cd-table");
        var thead = el("thead");
        var hr = el("tr");
        hr.appendChild(el("th", "", "Row"));
        items.forEach(function (it) { hr.appendChild(el("th", "", shortName(it))); });
        thead.appendChild(hr);
        table.appendChild(thead);
        var tbody = el("tbody");
        criteria.forEach(function (c) {
          var tr = el("tr");
          var th = el("th", "");
          th.appendChild(el("div", "", c.label));
          th.appendChild(el("code", "muted", c.key));
          var more = el("button", "btn btn--ghost btn--sm", "Row colours");
          more.type = "button";
          th.appendChild(more);
          tr.appendChild(th);
          items.forEach(function (it) {
            var td = el("td");
            var input = document.createElement("input");
            input.type = "text";
            input.maxLength = 200;
            input.placeholder = "real value";
            input.value = ((state.cells[c.key] || {})[itemKey(it)]) || "";
            input.addEventListener("input", function () {
              var b = bag("cells", c.key);
              var v = input.value.trim();
              if (v) b[itemKey(it)] = v; else delete b[itemKey(it)];
              tidy("cells", c.key);
            });
            td.appendChild(input);
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
          var colorRow = el("tr", "cd-rowcolors");
          colorRow.hidden = !(state.rows[c.key] && Object.keys(state.rows[c.key]).length);
          var ctd = el("td");
          ctd.colSpan = items.length + 1;
          var cg = el("div", "cd-grid");
          ROW_COLORS.forEach(function (rc) {
            cg.appendChild(colorField(rc[1], function () { return (state.rows[c.key] || {})[rc[0]]; }, function (v) { setIn("rows", c.key, rc[0], v); }));
          });
          ctd.appendChild(cg);
          colorRow.appendChild(ctd);
          more.addEventListener("click", function () { colorRow.hidden = !colorRow.hidden; });
          tbody.appendChild(colorRow);
        });
        table.appendChild(tbody);
        wrap.appendChild(table);
        s3.appendChild(wrap);
      }
      var add = el("button", "btn btn--ghost btn--sm", "+ Add custom row");
      add.type = "button";
      add.addEventListener("click", function () {
        var key = "custom_" + Math.random().toString(36).slice(2, 6);
        opts.addCriterion(key, "Custom row");
      });
      s3.appendChild(add);
      root.appendChild(s3);
    }

    function later() { clearTimeout(timer); timer = setTimeout(render, 120); }
    (opts.watch || []).forEach(function (n) {
      if (!n) return;
      new MutationObserver(later).observe(n, { childList: true, subtree: true });
      n.addEventListener("change", later);
      n.addEventListener("input", later);
    });
    render();

    return {
      read: function () {
        // drop values of rows/items that are no longer on the page
        var keys = {};
        (opts.getCriteria() || []).forEach(function (c) { keys[c.key] = true; });
        var itemKeys = {};
        (opts.getItems() || []).forEach(function (i) { itemKeys[itemKey(i)] = true; });
        var out = { page: state.page, items: {}, rows: {}, cells: {} };
        Object.keys(state.items).forEach(function (k) { if (itemKeys[k]) out.items[k] = state.items[k]; });
        Object.keys(state.rows).forEach(function (k) { if (keys[k]) out.rows[k] = state.rows[k]; });
        Object.keys(state.cells).forEach(function (k) {
          if (!keys[k]) return;
          out.cells[k] = {};
          Object.keys(state.cells[k]).forEach(function (ik) { if (itemKeys[ik]) out.cells[k][ik] = state.cells[k][ik]; });
        });
        return out;
      },
      load: function (design) {
        var d = design || {};
        state = { page: d.page || {}, items: d.items || {}, rows: d.rows || {}, cells: d.cells || {} };
        render();
      },
      refresh: render
    };
  }

  window.ComparisonDesign = { mount: mount };
})();
