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
  initContentItemEditForm();
  initCustomTypeEditForm();
  initComparisonEditForm();
  initContentTypeSettingsForm();
  loadGenericReviewsTable();
  initGenericReviewForm();
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
          <a href="/en/dashboard/content-item/edit/${i.content_type}/${i.slug}" class="btn btn--ghost btn--sm">Edit</a>
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
          <a href="/en/dashboard/custom-type/edit/${t.slug}" class="btn btn--ghost btn--sm">Edit</a>
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
          <a href="/en/dashboard/comparison/edit/${c.content_type}/${c.slug}" class="btn btn--ghost btn--sm">Edit</a>
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

// =====================================================
// EDIT FORMS + SETTINGS + GENERIC REVIEWS (production-readiness pass)
// Same no-op-if-absent guard style as every function above.
// =====================================================

// ---- Content item edit ----
async function initContentItemEditForm() {
  const form = document.getElementById("contentItemEditForm");
  if (!form) return;

  const contentType = form.dataset.contentType;
  const slug = form.dataset.slug;
  const alertEl = document.getElementById("contentItemEditAlert");
  const sportsbookFields = document.getElementById("sportsbookFields");
  const affiliatePartnerFields = document.getElementById("affiliatePartnerFields");
  const customFieldsContainer = document.getElementById("customFieldsContainer");
  const customFieldRows = document.getElementById("customFieldRows");

  if (contentType === "sportsbook") sportsbookFields.style.display = "";
  if (contentType === "affiliate_partner") affiliatePartnerFields.style.display = "";

  // Load current values and pre-fill the form
  try {
    const res = await fetch(`/en/api/v1/content-item/get?content_type=${encodeURIComponent(contentType)}&slug=${encodeURIComponent(slug)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to load");
    const item = data.item;
    for (const [key, val] of Object.entries({
      name: item.name, title: item.title, description: item.description, website: item.website,
      rating: item.rating, license: item.license, license_country: item.license_country,
      linked_affiliate_partner_id: item.linked_affiliate_partner_id, sort_order: item.sort_order,
      status: item.status, seo_title: item.seo_title, seo_description: item.seo_description, seo_keywords: item.seo_keywords,
    })) {
      const el = form.elements[key];
      if (el && val !== null && val !== undefined) el.value = val;
    }
    for (const key of ["live_betting", "pre_match", "cashout", "mobile_app", "featured", "published"]) {
      const el = form.elements[key];
      if (el) el.checked = !!item[key];
    }

    if (contentType === "custom") {
      customFieldsContainer.style.display = "";
      const cfRes = await fetch(`/en/api/v1/content-item/custom-field-values?content_type=custom&slug=${encodeURIComponent(slug)}`);
      const cfData = await cfRes.json();
      if (cfData.success) {
        customFieldRows.innerHTML = (cfData.definitions || []).map((def) => `
          <label>${def.label}
            <input type="text" class="custom-field-input" data-field-key="${def.field_key}" value="${(cfData.values[def.field_key] || "").toString().replace(/"/g, "&quot;")}">
          </label>
        `).join("") || "<p class='muted'>This type has no custom fields defined.</p>";
      }
    }
  } catch (e) {
    alertEl.className = "alert alert--error";
    alertEl.textContent = "Failed to load current values: " + e.message;
    alertEl.style.display = "block";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertEl.style.display = "none";
    const formData = new FormData(form);
    const payload = {
      content_type: contentType, slug,
      name: formData.get("name"), title: formData.get("title") || null, description: formData.get("description") || null,
      website: formData.get("website") || null, rating: formData.get("rating"),
      license: formData.get("license") || null, license_country: formData.get("license_country") || null,
      live_betting: formData.get("live_betting") === "on", pre_match: formData.get("pre_match") === "on",
      cashout: formData.get("cashout") === "on", mobile_app: formData.get("mobile_app") === "on",
      linked_affiliate_partner_id: formData.get("linked_affiliate_partner_id") || null,
      featured: formData.get("featured") === "on", sort_order: formData.get("sort_order"),
      status: formData.get("status"), published: formData.get("published") === "on",
      seo_title: formData.get("seo_title") || null, seo_description: formData.get("seo_description") || null, seo_keywords: formData.get("seo_keywords") || null,
    };
    if (contentType === "custom") {
      const values = {};
      customFieldRows.querySelectorAll(".custom-field-input").forEach((input) => {
        values[input.dataset.fieldKey] = input.value;
      });
      payload.custom_field_values = values;
    }
    try {
      const res = await fetch("/en/api/v1/content-item/update", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      alertEl.className = data.success ? "alert alert--success" : "alert alert--error";
      alertEl.textContent = data.success ? "Saved." : (data.error || "Failed to save");
      alertEl.style.display = "block";
    } catch {
      alertEl.className = "alert alert--error";
      alertEl.textContent = "Network error. Try again.";
      alertEl.style.display = "block";
    }
  });
}

// ---- Custom type edit ----
async function initCustomTypeEditForm() {
  const form = document.getElementById("customTypeEditForm");
  if (!form) return;

  const typeSlug = form.dataset.typeSlug;
  const alertEl = document.getElementById("customTypeEditAlert");
  const existingFieldsList = document.getElementById("existingFieldsList");
  const newFieldRows = document.getElementById("newFieldRows");
  const template = document.getElementById("fieldRowTemplate");

  document.getElementById("addFieldRowBtn").addEventListener("click", () => {
    newFieldRows.appendChild(template.content.cloneNode(true));
  });
  newFieldRows.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-field-row")) e.target.closest(".field-row").remove();
  });

  try {
    const [typesRes, fieldsRes] = await Promise.all([
      fetch("/en/api/v1/custom-types/list"),
      fetch(`/en/api/v1/custom-type/fields?type_slug=${encodeURIComponent(typeSlug)}`),
    ]);
    const typesData = await typesRes.json();
    const type = (typesData.types || []).find((t) => t.slug === typeSlug);
    if (type) {
      form.elements.label.value = type.label;
      form.elements.plural_label.value = type.plural_label;
      form.elements.icon.value = type.icon || "";
      form.elements.review_enabled.checked = !!type.review_enabled;
      form.elements.comparison_enabled.checked = !!type.comparison_enabled;
    }
    const fieldsData = await fieldsRes.json();
    existingFieldsList.innerHTML = (fieldsData.fields || []).length
      ? "<ul>" + fieldsData.fields.map((f) => `<li>${f.label} (${f.field_key}) — ${f.field_type}${f.required ? ", required" : ""}</li>`).join("") + "</ul>"
      : "No fields defined yet.";
  } catch (e) {
    alertEl.className = "alert alert--error";
    alertEl.textContent = "Failed to load current values.";
    alertEl.style.display = "block";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertEl.style.display = "none";
    const formData = new FormData(form);
    const newFields = Array.from(newFieldRows.querySelectorAll(".field-row")).map((row) => ({
      field_key: row.querySelector(".field-key").value.trim(),
      label: row.querySelector(".field-label").value.trim(),
      field_type: row.querySelector(".field-type").value,
      required: row.querySelector(".field-required").checked,
    })).filter((f) => f.field_key && f.label);

    try {
      const res = await fetch("/en/api/v1/custom-type/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: typeSlug, label: formData.get("label"), plural_label: formData.get("plural_label"),
          icon: formData.get("icon") || null, review_enabled: formData.get("review_enabled") === "on",
          comparison_enabled: formData.get("comparison_enabled") === "on", new_fields: newFields,
        }),
      });
      const data = await res.json();
      alertEl.className = data.success ? "alert alert--success" : "alert alert--error";
      alertEl.textContent = data.success ? "Saved." : (data.error || "Failed to save");
      alertEl.style.display = "block";
      if (data.success) newFieldRows.innerHTML = "";
    } catch {
      alertEl.className = "alert alert--error";
      alertEl.textContent = "Network error. Try again.";
      alertEl.style.display = "block";
    }
  });
}

// ---- Comparison edit ----
async function initComparisonEditForm() {
  const form = document.getElementById("comparisonEditForm");
  if (!form) return;

  const compareType = form.dataset.compareType;
  const slug = form.dataset.slug;
  const alertEl = document.getElementById("comparisonEditAlert");
  const itemRowsContainer = document.getElementById("itemRows");
  const itemTemplate = document.getElementById("itemRowTemplate");
  const criterionRowsContainer = document.getElementById("criterionRows");
  const criterionTemplate = document.getElementById("criterionRowTemplate");

  document.getElementById("addItemRowBtn").addEventListener("click", () => {
    itemRowsContainer.appendChild(itemTemplate.content.cloneNode(true));
  });
  itemRowsContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-item-row")) e.target.closest(".item-row").remove();
  });
  document.getElementById("addCriterionRowBtn").addEventListener("click", () => {
    criterionRowsContainer.appendChild(criterionTemplate.content.cloneNode(true));
  });
  criterionRowsContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-criterion-row")) e.target.closest(".criterion-row").remove();
  });

  try {
    const res = await fetch(`/en/api/v1/comparison/get?content_type=${encodeURIComponent(compareType)}&slug=${encodeURIComponent(slug)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    const c = data.comparison;
    form.elements.title.value = c.title;
    form.elements.description.value = c.description || "";
    form.elements.status.value = c.status;
    form.elements.seo_title.value = c.seo_title || "";
    form.elements.seo_description.value = c.seo_description || "";
    if (c.editorial_selection_item_type) {
      form.elements.editorial_selection_item_type.value = c.editorial_selection_item_type;
      form.elements.editorial_selection_item_id.value = c.editorial_selection_item_id;
    }
    (data.items || []).forEach((item) => {
      const row = itemTemplate.content.cloneNode(true);
      row.querySelector(".item-content-type").value = item.item_content_type;
      row.querySelector(".item-id").value = item.item_id;
      itemRowsContainer.appendChild(row);
    });
    let criteria = [];
    try { criteria = JSON.parse(c.criteria_json || "[]"); } catch {}
    criteria.forEach((crit) => {
      const row = criterionTemplate.content.cloneNode(true);
      row.querySelector(".criterion-key").value = crit.key;
      row.querySelector(".criterion-label").value = crit.label;
      criterionRowsContainer.appendChild(row);
    });
  } catch (e) {
    alertEl.className = "alert alert--error";
    alertEl.textContent = "Failed to load current values.";
    alertEl.style.display = "block";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
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

    try {
      const res = await fetch("/en/api/v1/comparison/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: compareType, slug, title: formData.get("title"), description: formData.get("description") || null,
          status: formData.get("status"), items, criteria,
          editorial_selection_item_type: editorialType || null,
          editorial_selection_item_id: editorialType ? (parseInt(formData.get("editorial_selection_item_id")) || null) : null,
          seo_title: formData.get("seo_title") || null, seo_description: formData.get("seo_description") || null,
        }),
      });
      const data = await res.json();
      alertEl.className = data.success ? "alert alert--success" : "alert alert--error";
      alertEl.textContent = data.success ? "Saved." : (data.error || "Failed to save");
      alertEl.style.display = "block";
    } catch {
      alertEl.className = "alert alert--error";
      alertEl.textContent = "Network error. Try again.";
      alertEl.style.display = "block";
    }
  });
}

// ---- Content type enablement settings ----
async function initContentTypeSettingsForm() {
  const form = document.getElementById("contentTypeSettingsForm");
  if (!form) return;

  const alertEl = document.getElementById("settingsAlert");
  const loadingEl = document.getElementById("settingsLoading");

  try {
    const res = await fetch("/en/api/v1/content-types-enabled");
    const data = await res.json();
    if (data.success) {
      document.getElementById("toggleSportsbook").checked = !!data.enablement.sportsbook;
      document.getElementById("toggleAffiliatePartner").checked = !!data.enablement.affiliate_partner;
      document.getElementById("toggleCustom").checked = !!data.enablement.custom;
    }
    loadingEl.style.display = "none";
    form.style.display = "";
  } catch {
    loadingEl.textContent = "Failed to load settings.";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertEl.style.display = "none";
    try {
      const res = await fetch("/en/api/v1/content-types-enabled/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sportsbook: document.getElementById("toggleSportsbook").checked,
          affiliate_partner: document.getElementById("toggleAffiliatePartner").checked,
          custom: document.getElementById("toggleCustom").checked,
        }),
      });
      const data = await res.json();
      alertEl.className = data.success ? "alert alert--success" : "alert alert--error";
      alertEl.textContent = data.success ? "Settings saved. Changes are live immediately." : (data.error || "Failed to save");
      alertEl.style.display = "block";
    } catch {
      alertEl.className = "alert alert--error";
      alertEl.textContent = "Network error. Try again.";
      alertEl.style.display = "block";
    }
  });
}

// ---- Generic reviews (sportsbook/affiliate_partner/custom) ----
async function loadGenericReviewsTable(reviewedContentType) {
  const tbody = document.getElementById("genericReviewsTableBody");
  if (!tbody) return;
  const typeFilter = document.getElementById("genericReviewTypeFilter");
  const type = reviewedContentType || (typeFilter ? typeFilter.value : "sportsbook");

  try {
    const res = await fetch(`/en/api/v1/generic-reviews/list?reviewed_content_type=${encodeURIComponent(type)}`);
    const data = await res.json();
    const reviews = data.reviews || [];
    if (reviews.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="muted">No reviews yet for this type.</td></tr>';
      return;
    }
    tbody.innerHTML = reviews.map((r) => `
      <tr>
        <td><strong>${r.title}</strong></td>
        <td>${r.slug}</td>
        <td>${r.rating != null ? "★ " + r.rating : "—"}</td>
        <td>${r.published ? "Yes" : "No"}</td>
        <td class="table-actions"></td>
      </tr>
    `).join("");
  } catch {
    tbody.innerHTML = '<tr><td colspan="5" class="muted">Failed to load.</td></tr>';
  }
}

document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "genericReviewTypeFilter") loadGenericReviewsTable(e.target.value);
});

async function initGenericReviewForm() {
  const form = document.getElementById("genericReviewForm");
  if (!form) return;

  const typeSelect = document.getElementById("reviewedContentTypeSelect");
  const itemSelect = document.getElementById("reviewedItemSelect");

  async function loadItemOptions() {
    itemSelect.innerHTML = '<option value="">Loading...</option>';
    try {
      const res = await fetch(`/en/api/v1/content-items/list?content_type=${encodeURIComponent(typeSelect.value)}`);
      const data = await res.json();
      const items = data.items || [];
      itemSelect.innerHTML = items.length
        ? items.map((i) => `<option value="${i.id}">${i.name} (${i.slug})</option>`).join("")
        : '<option value="">No items of this type yet -- create one first</option>';
    } catch {
      itemSelect.innerHTML = '<option value="">Failed to load items</option>';
    }
  }
  typeSelect.addEventListener("change", loadItemOptions);
  loadItemOptions();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("genericReviewFormAlert");
    alertEl.style.display = "none";
    const formData = new FormData(form);

    // pros/cons textareas (one per line) -> JSON array, matching the
    // storage shape reviews.pros/cons already use for casino reviews.
    const toJsonArray = (text) => JSON.stringify((text || "").split("\n").map((s) => s.trim()).filter(Boolean));

    const payload = {
      reviewed_content_type: formData.get("reviewed_content_type"),
      reviewed_content_id: parseInt(formData.get("reviewed_content_id")),
      title: formData.get("title"), slug: formData.get("slug"), content: formData.get("content"),
      pros: toJsonArray(formData.get("pros")), cons: toJsonArray(formData.get("cons")),
      rating: formData.get("rating") || null, verdict: formData.get("verdict") || null,
      published: formData.get("published") === "on",
      seo_title: formData.get("seo_title") || null, seo_description: formData.get("seo_description") || null, seo_keywords: formData.get("seo_keywords") || null,
    };
    if (!payload.reviewed_content_id) {
      alertEl.className = "alert alert--error";
      alertEl.textContent = "Select an item to review -- none available for this type yet.";
      alertEl.style.display = "block";
      return;
    }
    try {
      const res = await fetch("/en/api/v1/generic-review/create", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        alertEl.className = "alert alert--success";
        alertEl.textContent = "Review created successfully!";
        alertEl.style.display = "block";
        form.reset();
        setTimeout(() => { window.location.href = "/en/dashboard/reviews/generic"; }, 1500);
      } else {
        alertEl.className = "alert alert--error";
        alertEl.textContent = data.error || "Failed to create review";
        alertEl.style.display = "block";
      }
    } catch {
      alertEl.className = "alert alert--error";
      alertEl.textContent = "Network error. Try again.";
      alertEl.style.display = "block";
    }
  });
}
