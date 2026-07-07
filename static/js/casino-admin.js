// =====================================================
// CASINO ADMIN: Edit form pre-fill + category management
// Used on /en/dashboard/casino/edit/:slug (future)
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  initCasinoEditForm();
  initCasinoEditSubmit();
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
  } catch {
    form.innerHTML = '<div class="alert alert--error">Failed to load casino data.</div>';
  }
}

function initCasinoEditSubmit() {
  const form = document.getElementById("casinoEditForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("casinoEditAlert");
    if (alertEl) alertEl.style.display = "none";

    const formData = new FormData(form);
    const features = formData.get("features");
    const payload = {
      slug: formData.get("slug"),
      name: formData.get("name"),
      logo: formData.get("logo") || null,
      website_url: formData.get("website_url"),
      affiliate_url: formData.get("affiliate_url"),
      rating: parseFloat(formData.get("rating")) || 0,
      bonus_title: formData.get("bonus_title") || null,
      bonus_value: formData.get("bonus_value") || null,
      features: features ? features.split(",").map(f => f.trim()).filter(Boolean) : [],
      seo_title: formData.get("seo_title") || null,
      seo_description: formData.get("seo_description") || null,
      featured: parseInt(formData.get("featured")) || 0,
      sort_order: parseInt(formData.get("sort_order")) || 0,
      status: formData.get("status") || "draft",
    };

    try {
      const res = await fetch("/en/api/v1/casino/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        if (alertEl) { alertEl.className = "alert alert--success"; alertEl.textContent = "Casino updated!"; alertEl.style.display = "block"; }
        setTimeout(() => { window.location.href = "/en/dashboard/casinos"; }, 1500);
      } else {
        if (alertEl) { alertEl.className = "alert alert--error"; alertEl.textContent = data.error || "Failed"; alertEl.style.display = "block"; }
      }
    } catch {
      if (alertEl) { alertEl.className = "alert alert--error"; alertEl.textContent = "Network error"; alertEl.style.display = "block"; }
    }
  });
}
