// =====================================================
// ADMIN DASHBOARD JS
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  loadTopCasinos();
  loadTopCountries();
  loadCasinosTable();
  initCasinoForm();
  loadContentItemsTable();
  initContentItemForm();
  loadCustomTypesTable();
  initCustomTypeForm();
  loadComparisonsTable();
  initComparisonForm();
});

// ---- Stats ----
async function loadStats() {
  try {
    const res = await fetch("/en/api/v1/dashboard");
    const data = await res.json();

    const el = (id) => document.getElementById(id);
    if (el("statCasinos")) el("statCasinos").textContent = data.casinos ?? 0;
    if (el("statReviews")) el("statReviews").textContent = data.reviews ?? 0;
    if (el("statClicks")) el("statClicks").textContent = data.clicks ?? 0;
    if (el("statPages")) el("statPages").textContent = data.pages ?? 0;
  } catch {
    console.error("Failed to load stats");
  }
}

// ---- Top casinos by clicks ----
async function loadTopCasinos() {
  const container = document.getElementById("topCasinosTable");
  if (!container) return;

  try {
    const res = await fetch("/en/api/v1/stats/top-casinos");
    const data = await res.json();
    const items = data.casinos || [];

    if (items.length === 0) {
      container.innerHTML = '<p class="muted">No click data yet.</p>';
      return;
    }

    container.innerHTML = `
      <table class="mini-table">
        <thead><tr><th>Casino</th><th>Clicks</th></tr></thead>
        <tbody>
          ${items.map((c) => `
            <tr><td>${c.casino_slug}</td><td>${c.clicks}</td></tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch {
    container.innerHTML = '<p class="muted">Failed to load.</p>';
  }
}

// ---- Top countries by clicks ----
async function loadTopCountries() {
  const container = document.getElementById("topCountriesTable");
  if (!container) return;

  try {
    const res = await fetch("/en/api/v1/stats/countries");
    const data = await res.json();
    const items = data.countries || [];

    if (items.length === 0) {
      container.innerHTML = '<p class="muted">No country data yet.</p>';
      return;
    }

    container.innerHTML = `
      <table class="mini-table">
        <thead><tr><th>Country</th><th>Clicks</th></tr></thead>
        <tbody>
          ${items.map((c) => `
            <tr><td>${c.country_code || "Unknown"}</td><td>${c.clicks}</td></tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch {
    container.innerHTML = '<p class="muted">Failed to load.</p>';
  }
}

// ---- Casinos table ----
async function loadCasinosTable() {
  const tbody = document.getElementById("casinosTableBody");
  if (!tbody) return;

  try {
    const res = await fetch("/en/api/v1/casinos/list");
    const data = await res.json();
    const casinos = data.casinos || [];

    if (casinos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="muted">No casinos yet.</td></tr>';
      return;
    }

    tbody.innerHTML = casinos
      .map(
        (c) => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.slug}</td>
        <td>★ ${c.rating || "N/A"}</td>
        <td>${c.featured ? "⭐ Yes" : "—"}</td>
        <td><span class="status-badge ${c.status === "published" ? "status-published" : "status-draft"}">${c.status || "draft"}</span></td>
        <td class="table-actions">
          <a href="/en/dashboard/casino/edit/${c.slug}" class="btn btn--ghost btn--sm">Edit</a>
          <a href="/en/casino/${c.slug}" class="btn btn--ghost btn--sm" target="_blank">View</a>
          <button class="btn btn--danger btn--sm" onclick="deleteCasino('${c.slug}')">Delete</button>
        </td>
      </tr>
    `
      )
      .join("");
  } catch {
    tbody.innerHTML = '<tr><td colspan="6" class="muted">Failed to load.</td></tr>';
  }
}

// ---- Delete casino ----
async function deleteCasino(slug) {
  if (!confirm(`Delete casino "${slug}"? This cannot be undone.`)) return;

  try {
    const res = await fetch("/en/api/v1/casino/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const data = await res.json();

    if (data.success) {
      loadCasinosTable();
    } else {
      alert(data.error || "Delete failed");
    }
  } catch {
    alert("Network error. Try again.");
  }
}

// ---- Casino create form ----
async function initCasinoForm() {
  const form = document.getElementById("casinoForm");
  if (!form) return;

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
    } catch {
      countryBox.innerHTML = '<p class="muted">Failed to load countries</p>';
    }
  }
    // Load categories for assignment
  const categoryBox = document.getElementById("categoryCheckboxes");
  if (categoryBox && !categoryBox.dataset.loaded) {
    categoryBox.dataset.loaded = "1";
    try {
      const catRes = await fetch("/en/api/v1/categories/list");
      const catData = await catRes.json();
      const cats = catData.categories || [];
      categoryBox.innerHTML = cats.map(c => `
        <label style="display:block;padding:4px 0">
          <input type="checkbox" value="${c.id}"> ${c.name} (${c.slug})
        </label>
      `).join("");
    } catch {
      categoryBox.innerHTML = '<p class="muted">Failed to load categories</p>';
    }
  }


  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("casinoFormAlert");
    alertEl.style.display = "none";

    const formData = new FormData(form);
    const features = formData.get("features");
    const payload = {
      name: formData.get("name"),
      slug: formData.get("slug"),
      logo: formData.get("logo") || null,
      website_url: formData.get("website_url"),
      affiliate_url: formData.get("affiliate_url"),
      rating: parseFloat(formData.get("rating")) || 0,
      bonus_title: formData.get("bonus_title") || null,
      bonus_value: formData.get("bonus_value") || null,
      features: features ? features.split(",").map((f) => f.trim()).filter(Boolean) : [],
      seo_title: formData.get("seo_title") || null,
      seo_description: formData.get("seo_description") || null,
      seo_keywords: formData.get("seo_keywords") || null,
      featured: parseInt(formData.get("featured")) || 0,
      sort_order: parseInt(formData.get("sort_order")) || 0,
      status: formData.get("status") || "draft",
      category_ids: Array.from(
        document.querySelectorAll("#categoryCheckboxes input:checked")
      ).map(c => parseInt(c.value)),
    };

    try {
      const res = await fetch("/en/api/v1/casino/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

           if (data.success) {
        alertEl.className = "alert alert--success";
        alertEl.textContent = "Casino created successfully!";
        alertEl.style.display = "block";

        // Capture geo data BEFORE form.reset()
        const geoMode = formData.get("geo_mode") || "allow";
        const selectedCountries = Array.from(
          document.querySelectorAll("#countryCheckboxes input:checked")
        ).map(c => c.value);

        // Sync geo rules FIRST
        if (selectedCountries.length > 0) {
          const rules = selectedCountries.map(code => ({
            country_code: code,
            status: geoMode === "allow" ? "allowed" : "blocked",
            bonus_override: null
          }));
          await fetch("/en/api/v1/geo/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ casino_slug: payload.slug, rules })
          });
        }

        form.reset();  // NOW safe to reset
        setTimeout(() => {
          window.location.href = "/en/dashboard/casinos";
        }, 1500);
      } else {
        alertEl.className = "alert alert--error";
        alertEl.textContent = data.error || "Failed to create casino";
        alertEl.style.display = "block";
      }
    } catch {
      alertEl.className = "alert alert--error";
      alertEl.textContent = "Network error. Try again.";
      alertEl.style.display = "block";
    }
  });
}

// =====================================================
// GENERIC CONTENT ENGINE (Phase 8 — admin UI)
// Every function below no-ops if its page's elements aren't present
// on the current page, same guard style as loadCasinosTable() above
// -- safe to call unconditionally from DOMContentLoaded on every
// admin page.
// =====================================================

// ---- Content items table (sportsbook/affiliate_partner/custom) ----
async function loadContentItemsTable(contentType) {
  const tbody = document.getElementById("contentItemsTableBody");
  if (!tbody) return;

  const typeFilter = document.getElementById("contentItemTypeFilter");
  const type = contentType || (typeFilter ? typeFilter.value : "sportsbook");

  try {
    const res = await fetch(`/en/api/v1/content-items/list?content_type=${encodeURIComponent(type)}`);
    const data = await res.json();
    const items = data.items || [];

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="muted">No items yet for this type.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map((i) => `
      <tr>
        <td><strong>${i.name}</strong></td>
        <td>${i.slug}</td>
        <td>${i.content_type}${i.custom_type_slug ? ` (${i.custom_type_slug})` : ""}</td>
        <td>★ ${i.rating || "N/A"}</td>
        <td><span class="status-badge ${i.status === "published" ? "status-published" : "status-draft"}">${i.status || "draft"}</span></td>
        <td class="table-actions">
          <button class="btn btn--danger btn--sm" onclick="deleteContentItem('${i.content_type}', '${i.slug}')">Delete</button>
        </td>
      </tr>
    `).join("");
  } catch {
    tbody.innerHTML = '<tr><td colspan="6" class="muted">Failed to load.</td></tr>';
  }
}

document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "contentItemTypeFilter") {
    loadContentItemsTable(e.target.value);
  }
  if (e.target && e.target.id === "comparisonTypeFilter") {
    loadComparisonsTable(e.target.value);
  }
});

async function deleteContentItem(contentType, slug) {
  if (!confirm(`Delete "${slug}"? This cannot be undone.`)) return;
  try {
    const res = await fetch("/en/api/v1/content-item/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_type: contentType, slug }),
    });
    const data = await res.json();
    if (data.success) loadContentItemsTable(contentType);
    else alert(data.error || "Delete failed");
  } catch {
    alert("Network error. Try again.");
  }
}

// ---- Content item create form ----
async function initContentItemForm() {
  const form = document.getElementById("contentItemForm");
  if (!form) return;

  const typeSelect = document.getElementById("contentTypeSelect");
  const customTypeField = document.getElementById("customTypeField");
  const customTypeSelect = document.getElementById("customTypeSelect");
  const sportsbookFields = document.getElementById("sportsbookFields");
  const affiliatePartnerFields = document.getElementById("affiliatePartnerFields");

  async function loadCustomTypeOptions() {
    if (customTypeSelect.dataset.loaded) return;
    customTypeSelect.dataset.loaded = "1";
    try {
      const res = await fetch("/en/api/v1/custom-types/list");
      const data = await res.json();
      customTypeSelect.innerHTML = (data.types || [])
        .map((t) => `<option value="${t.slug}">${t.label}</option>`).join("");
    } catch {
      customTypeSelect.innerHTML = '<option value="">Failed to load custom types</option>';
    }
  }

  function updateVisibleFields() {
    const type = typeSelect.value;
    customTypeField.style.display = type === "custom" ? "" : "none";
    sportsbookFields.style.display = type === "sportsbook" ? "" : "none";
    affiliatePartnerFields.style.display = type === "affiliate_partner" ? "" : "none";
    if (type === "custom") loadCustomTypeOptions();
  }

  typeSelect.addEventListener("change", updateVisibleFields);
  updateVisibleFields();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("contentItemFormAlert");
    alertEl.style.display = "none";

    const formData = new FormData(form);
    const payload = {
      content_type: formData.get("content_type"),
      custom_type_slug: formData.get("custom_type_slug") || null,
      name: formData.get("name"),
      slug: formData.get("slug"),
      title: formData.get("title") || null,
      description: formData.get("description") || null,
      website: formData.get("website") || null,
      rating: parseFloat(formData.get("rating")) || 0,
      license: formData.get("license") || null,
      license_country: formData.get("license_country") || null,
      live_betting: formData.get("live_betting") === "on",
      pre_match: formData.get("pre_match") === "on",
      cashout: formData.get("cashout") === "on",
      mobile_app: formData.get("mobile_app") === "on",
      linked_affiliate_partner_id: formData.get("linked_affiliate_partner_id") || null,
      featured: formData.get("featured") === "on" ? 1 : 0,
      sort_order: parseInt(formData.get("sort_order")) || 0,
      status: formData.get("status") || "draft",
      published: formData.get("published") === "on",
      seo_title: formData.get("seo_title") || null,
      seo_description: formData.get("seo_description") || null,
      seo_keywords: formData.get("seo_keywords") || null,
    };

    try {
      const res = await fetch("/en/api/v1/content-item/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        alertEl.className = "alert alert--success";
        alertEl.textContent = "Content item created successfully!";
        alertEl.style.display = "block";
        form.reset();
        setTimeout(() => { window.location.href = "/en/dashboard/content-items"; }, 1500);
      } else {
        alertEl.className = "alert alert--error";
        alertEl.textContent = data.error || "Failed to create content item";
        alertEl.style.display = "block";
      }
    } catch {
      alertEl.className = "alert alert--error";
      alertEl.textContent = "Network error. Try again.";
      alertEl.style.display = "block";
    }
  });
}

// ---- Custom content types table ----
async function loadCustomTypesTable() {
  const tbody = document.getElementById("customTypesTableBody");
  if (!tbody) return;

  try {
    const res = await fetch("/en/api/v1/custom-types/list");
    const data = await res.json();
    const types = data.types || [];

    if (types.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="muted">No custom types yet.</td></tr>';
      return;
    }

    tbody.innerHTML = types.map((t) => `
      <tr>
        <td><strong>${t.label}</strong></td>
        <td>${t.slug}</td>
        <td>${t.plural_label}</td>
        <td>${t.review_enabled ? "Yes" : "No"}</td>
        <td>${t.comparison_enabled ? "Yes" : "No"}</td>
        <td class="table-actions">
          <a href="/en/custom/${t.slug}" class="btn btn--ghost btn--sm" target="_blank">View</a>
        </td>
      </tr>
    `).join("");
  } catch {
    tbody.innerHTML = '<tr><td colspan="6" class="muted">Failed to load.</td></tr>';
  }
}

// ---- Custom type create form (with dynamic field-definition rows) ----
function initCustomTypeForm() {
  const form = document.getElementById("customTypeForm");
  if (!form) return;

  const fieldRowsContainer = document.getElementById("fieldRows");
  const template = document.getElementById("fieldRowTemplate");

  document.getElementById("addFieldRowBtn").addEventListener("click", () => {
    const clone = template.content.cloneNode(true);
    fieldRowsContainer.appendChild(clone);
  });

  fieldRowsContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-field-row")) {
      e.target.closest(".field-row").remove();
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("customTypeFormAlert");
    alertEl.style.display = "none";

    const formData = new FormData(form);
    const fields = Array.from(fieldRowsContainer.querySelectorAll(".field-row")).map((row) => ({
      field_key: row.querySelector(".field-key").value.trim(),
      label: row.querySelector(".field-label").value.trim(),
      field_type: row.querySelector(".field-type").value,
      required: row.querySelector(".field-required").checked,
    })).filter((f) => f.field_key && f.label);

    const payload = {
      label: formData.get("label"),
      plural_label: formData.get("plural_label"),
      slug: formData.get("slug"),
      icon: formData.get("icon") || null,
      review_enabled: formData.get("review_enabled") === "on",
      comparison_enabled: formData.get("comparison_enabled") === "on",
      fields,
    };

    try {
      const res = await fetch("/en/api/v1/custom-type/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        alertEl.className = "alert alert--success";
        alertEl.textContent = "Custom type created successfully!";
        alertEl.style.display = "block";
        form.reset();
        setTimeout(() => { window.location.href = "/en/dashboard/custom-types"; }, 1500);
      } else {
        alertEl.className = "alert alert--error";
        alertEl.textContent = data.error || "Failed to create custom type";
        alertEl.style.display = "block";
      }
    } catch {
      alertEl.className = "alert alert--error";
      alertEl.textContent = "Network error. Try again.";
      alertEl.style.display = "block";
    }
  });
}

// ---- Comparisons table ----
async function loadComparisonsTable(contentType) {
  const tbody = document.getElementById("comparisonsTableBody");
  if (!tbody) return;

  const typeFilter = document.getElementById("comparisonTypeFilter");
  const type = contentType || (typeFilter ? typeFilter.value : "casino");

  try {
    const res = await fetch(`/en/api/v1/comparisons/list?content_type=${encodeURIComponent(type)}`);
    const data = await res.json();
    const comparisons = data.comparisons || [];

    if (comparisons.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="muted">No comparisons yet for this type.</td></tr>';
      return;
    }

    tbody.innerHTML = comparisons.map((c) => `
      <tr>
        <td><strong>${c.title}</strong></td>
        <td>${c.slug}</td>
        <td>${c.content_type}</td>
        <td><span class="status-badge ${c.status === "published" ? "status-published" : "status-draft"}">${c.status}</span></td>
        <td class="table-actions">
          <a href="/en/compare/${c.content_type}/${c.slug}" class="btn btn--ghost btn--sm" target="_blank">View</a>
        </td>
      </tr>
    `).join("");
  } catch {
    tbody.innerHTML = '<tr><td colspan="5" class="muted">Failed to load.</td></tr>';
  }
}

// ---- Comparison create form (with dynamic item + criterion rows) ----
function initComparisonForm() {
  const form = document.getElementById("comparisonForm");
  if (!form) return;

  const itemRowsContainer = document.getElementById("itemRows");
  const itemTemplate = document.getElementById("itemRowTemplate");
  document.getElementById("addItemRowBtn").addEventListener("click", () => {
    itemRowsContainer.appendChild(itemTemplate.content.cloneNode(true));
  });
  itemRowsContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-item-row")) e.target.closest(".item-row").remove();
  });

  const criterionRowsContainer = document.getElementById("criterionRows");
  const criterionTemplate = document.getElementById("criterionRowTemplate");
  document.getElementById("addCriterionRowBtn").addEventListener("click", () => {
    criterionRowsContainer.appendChild(criterionTemplate.content.cloneNode(true));
  });
  criterionRowsContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-criterion-row")) e.target.closest(".criterion-row").remove();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("comparisonFormAlert");
    alertEl.style.display = "none";

    const formData = new FormData(form);
    const items = Array.from(itemRowsContainer.querySelectorAll(".item-row")).map((row, idx) => ({
      item_content_type: row.querySelector(".item-content-type").value,
      item_id: parseInt(row.querySelector(".item-id").value),
      position: idx,
    })).filter((i) => i.item_id);

    const criteria = Array.from(criterionRowsContainer.querySelectorAll(".criterion-row")).map((row) => ({
      key: row.querySelector(".criterion-key").value.trim(),
      label: row.querySelector(".criterion-label").value.trim(),
    })).filter((c) => c.key && c.label);

    const editorialType = formData.get("editorial_selection_item_type");
    const payload = {
      content_type: formData.get("content_type"),
      title: formData.get("title"),
      slug: formData.get("slug"),
      description: formData.get("description") || null,
      status: formData.get("status") || "draft",
      items,
      criteria,
      editorial_selection_item_type: editorialType || null,
      editorial_selection_item_id: editorialType ? (parseInt(formData.get("editorial_selection_item_id")) || null) : null,
      seo_title: formData.get("seo_title") || null,
      seo_description: formData.get("seo_description") || null,
    };

    try {
      const res = await fetch("/en/api/v1/comparison/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        alertEl.className = "alert alert--success";
        alertEl.textContent = "Comparison created successfully!";
        alertEl.style.display = "block";
        form.reset();
        setTimeout(() => { window.location.href = "/en/dashboard/comparisons"; }, 1500);
      } else {
        alertEl.className = "alert alert--error";
        alertEl.textContent = data.error || "Failed to create comparison";
        alertEl.style.display = "block";
      }
    } catch {
      alertEl.className = "alert alert--error";
      alertEl.textContent = "Network error. Try again.";
      alertEl.style.display = "block";
    }
  });
}
