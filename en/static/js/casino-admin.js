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
    const res = await fetch("/en/api/v1/casinos/list");
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
        // Load countries for geo targeting
    const countryBox = document.getElementById("countryCheckboxes");
    if (countryBox && !countryBox.dataset.loaded) {
      countryBox.dataset.loaded = "1";
      try {
        const res = await fetch("/en/api/v1/countries/list");
        const data = await res.json();
        const countries = data.countries || [];
        countryBox.innerHTML = countries.map(c => `
          <label style="display:block;padding:4px 0">
            <input type="checkbox" value="${c.code}"> ${c.name} (${c.code})
          </label>
        `).join("");

        // Load existing geo rules
        const geoRes = await fetch(`/en/api/v1/geo/list?casino_slug=${slug}`);
        const geoData = await geoRes.json();
        const rules = geoData.rules || [];
        rules.forEach(r => {
          const cb = countryBox.querySelector(`input[value="${r.country_code}"]`);
          if (cb) {
            cb.checked = true;
            if (r.status === "blocked") {
              document.getElementById("geoMode").value = "block";
            }
          }
        });
      } catch {
        countryBox.innerHTML = '<p class="muted">Failed to load countries</p>';
      }
    }

  } catch {
    form.innerHTML = '<div class="alert alert--error">Failed to load casino data.</div>';
  }
}
