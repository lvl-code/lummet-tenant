// =====================================================
// CASINO ADMIN: Edit form pre-fill + category management
// Used on /en/dashboard/casino/edit/:slug (future)
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  initCasinoEditForm();
});

async function initCasinoEditForm() {
  const form = document.getElementById("casinoEditForm");
  if (!form) return;

  const slug = form.dataset.slug;
  if (!slug) return;

  try {
    const res = await fetch("/api/v1/casinos/list");
    const data = await res.json();
    const casino = (data.casinos || []).find((c) => c.slug === slug);

    if (!casino) {
      form.innerHTML = '<div class="alert alert--error">Casino not found.</div>';
      return;
    }

    // Pre-fill form fields
    const fields = ["name", "slug", "logo", "website_url", "affiliate_url", "rating", "bonus_title", "bonus_value", "seo_title", "seo_description", "featured", "sort_order", "status"];
    for (const field of fields) {
      const input = form.querySelector(`[name="${field}"]`);
      if (input && casino[field] !== undefined) {
        input.value = casino[field];
      }
    }
  } catch {
    form.innerHTML = '<div class="alert alert--error">Failed to load casino data.</div>';
  }
}
