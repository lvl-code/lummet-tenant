// Sections of a casino review: pick a review (search), build sections, save them in one go.
(function () {
  "use strict";
  var search = document.getElementById("rsReviewSearch");
  if (!search || !window.SectionBuilder || !window.EntityPicker) return;
  var $ = function (id) { return document.getElementById(id); };
  var reviews = null, builder = null, current = "";

  function showAlert(kind, msg) {
    var a = $("rsAlert"); a.className = "alert alert--" + kind; a.textContent = msg; a.style.display = "block";
  }
  function loadReviews() {
    if (reviews) return Promise.resolve(reviews);
    return fetch("/en/api/v1/reviews/list").then(function (r) { return r.json(); }).then(function (d) { reviews = (d && d.reviews) || []; return reviews; }).catch(function () { reviews = []; return reviews; });
  }
  function find(q) {
    q = String(q || "").trim().toLowerCase();
    return loadReviews().then(function (list) {
      return list.filter(function (r) { return !q || (r.title || "").toLowerCase().indexOf(q) > -1 || (r.slug || "").toLowerCase().indexOf(q) > -1 || (r.casino_slug || "").toLowerCase().indexOf(q) > -1; })
        .slice(0, 15).map(function (r) { return { value: r.slug, label: r.title || r.slug, sub: r.slug + (r.published ? "" : " · draft") }; });
    });
  }
  function open(item) {
    if (!item) { current = ""; $("rsPanel").hidden = true; return; }
    current = item.value; $("rsReviewSlug").value = current;
    $("rsAlert").style.display = "none";
    fetch("/en/api/v1/review-blocks/list?review_slug=" + encodeURIComponent(current)).then(function (r) { return r.json(); }).then(function (d) {
      builder.load(((d && d.sections) || []).map(function (s) { return { title: s.title || "", type: s.type, data: s.data }; }));
      $("rsPanel").hidden = false;
      var v = $("rsView"); v.href = "/en/review/" + encodeURIComponent(current); v.hidden = false;
    }).catch(function () { showAlert("error", "Could not load the sections."); $("rsPanel").hidden = false; });
  }
  builder = SectionBuilder.mount({ root: $("rsSections"), addButton: $("rsAdd"), presets: $("rsPresets"), onChange: function () {} });
  EntityPicker.attach(search, { search: find, onPick: open, onType: function () { open(null); } });

  $("rsSave").addEventListener("click", function () {
    if (!current) return;
    var secs = builder.read();
    if (secs.some(function (s) { return !String(s.title || "").trim(); })) { showAlert("error", "Give every section a title. It becomes its tab."); return; }
    var btn = $("rsSave"); btn.disabled = true;
    fetch("/en/api/v1/review-blocks/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ review_slug: current, sections: secs }) })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.success !== false && !d.error) showAlert("success", "Sections saved."); else showAlert("error", (d && d.error) || "Save failed."); })
      .catch(function () { showAlert("error", "Network error. Try again."); })
      .then(function () { btn.disabled = false; });
  });
})();
