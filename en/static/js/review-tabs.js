// Casino Reviews screen: three tabs (all reviews, add/edit, sections and page parts) so nothing sits at the bottom of a long page.
(function () {
  "use strict";
  var tabs = document.querySelectorAll("[data-rv-tab]"), panels = document.querySelectorAll("[data-rv-panel]");
  if (!tabs.length) return;
  function show(name, noHash) {
    Array.prototype.forEach.call(tabs, function (t) { var on = t.getAttribute("data-rv-tab") === name; t.classList.toggle("is-on", on); t.setAttribute("aria-selected", on ? "true" : "false"); });
    Array.prototype.forEach.call(panels, function (p) { p.hidden = p.getAttribute("data-rv-panel") !== name; });
    if (!noHash) { try { history.replaceState(null, "", "#" + name); } catch (e) {} }
    window.dispatchEvent(new Event("resize")); // editors that started hidden size themselves now
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  Array.prototype.forEach.call(tabs, function (t) { t.addEventListener("click", function () { show(t.getAttribute("data-rv-tab")); }); });
  // Edit buttons in the list switch to the form
  var body = document.getElementById("reviewsTableBody");
  if (body) body.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button");
    if (b && /editReview/.test(b.getAttribute("onclick") || "")) { var h = document.getElementById("rvEditHeading"); if (h) h.textContent = "Edit review"; setTimeout(function () { show("edit"); }, 60); }
  });
  var cancel = document.getElementById("reviewCancelEdit");
  if (cancel) cancel.addEventListener("click", function () { var h = document.getElementById("rvEditHeading"); if (h) h.textContent = "Add Review"; show("list"); });
  window.ReviewTabs = { show: show, sections: function (slug) { show("sections"); if (window.ReviewSections) window.ReviewSections.open(slug); } };
  var start = (location.hash || "").replace("#", "");
  if (/^(list|edit|sections)$/.test(start)) show(start, true);
})();
