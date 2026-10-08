// Comparison page: "Show differences only" hides rows where every item has the same value.
document.addEventListener("DOMContentLoaded", () => {
  const box = document.getElementById("cmpDiffOnly");
  const table = document.getElementById("cmpTable");
  if (!box || !table) return;
  box.addEventListener("change", () => table.classList.toggle("cmp-only-diff", box.checked));
});
