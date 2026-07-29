// =====================================================
// ADMIN: REVIEWS, NEWS, PAGES, SETTINGS, AI
// Handles all admin sub-pages beyond dashboard + casinos
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  loadReviewsTable();
  loadNewsTable();
  loadPagesTable();
  loadSettingsForm();
  initReviewForm();
  initNewsForm();
  initPageForm();
  initSettingsForm();
  initAIGenerator();
  loadCategoriesTable();
  initCategoryForm();
  loadCountriesTable();
  initCountryForm();
});

// ============================================
// REVIEWS
// ============================================

async function loadReviewsTable() {
  const tbody = document.getElementById("reviewsTableBody");
  if (!tbody) return;

  try {
    const res = await fetch("/en/api/v1/reviews/list");
    const data = await res.json();
    const reviews = data.reviews || [];

    if (reviews.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="muted">No reviews yet.</td></tr>';
      return;
    }

    tbody.innerHTML = reviews
      .map(
        (r) => `
      <tr>
        <td><strong>${r.title}</strong></td>
        <td>${r.casino_slug || "—"}</td>
        <td>${r.country_code || "Global"}</td>
        <td>★ ${r.rating || "N/A"}</td>
        <td class="table-actions">
          <button class="btn btn--ghost btn--sm" onclick="editReview('${r.slug}')">Edit</button>
          <a href="/en/review/${r.slug}" class="btn btn--ghost btn--sm" target="_blank">View</a>
          <button class="btn btn--danger btn--sm" onclick="deleteReview('${r.slug}')">Delete</button>
        </td>

      </tr>
    `
      )
      .join("");
  } catch {
    tbody.innerHTML = '<tr><td colspan="5" class="muted">Failed to load.</td></tr>';
  }
}

function initReviewForm() {
  const form = document.getElementById("reviewForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("reviewFormAlert");
    if (alertEl) alertEl.style.display = "none";

    const formData = new FormData(form);
    const isEdit = formData.get("id") ? true : false;
    const endpoint = isEdit ? "/en/api/v1/review/update" : "/en/api/v1/review/create";
    const payload = {
      slug: formData.get("slug"),
      casino_slug: formData.get("casino_slug"),
      country_code: formData.get("country_code") || null,
      title: formData.get("title"),
      content: formData.get("content"),
      pros: formData.get("pros") ? formData.get("pros").split("\n").map((p) => p.trim()).filter(Boolean) : [],
      cons: formData.get("cons") ? formData.get("cons").split("\n").map((c) => c.trim()).filter(Boolean) : [],
      rating: parseFloat(formData.get("rating")) || 0,
      seo_title: formData.get("seo_title") || null,
      seo_description: formData.get("seo_description") || null,
      author_id: formData.get("author_id") ? parseInt(formData.get("author_id")) : null,
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        if (alertEl) {
          alertEl.className = "alert alert--success";
          alertEl.textContent = isEdit ? "Review updated!" : "Review created!";
          alertEl.style.display = "block";
        }
        form.reset();
        form.querySelector("[name='id']").value = "";
        document.getElementById("reviewSubmitBtn").textContent = "Create Review";
        document.getElementById("reviewCancelEdit").style.display = "none";
        loadReviewsTable();
      } else {
        if (alertEl) {
          alertEl.className = "alert alert--error";
          alertEl.textContent = data.error || "Failed";
          alertEl.style.display = "block";
        }
      }
    } catch {
      if (alertEl) {
        alertEl.className = "alert alert--error";
        alertEl.textContent = "Network error";
        alertEl.style.display = "block";
      }
    }
  });
}

// ============================================
// NEWS
// ============================================

async function loadNewsTable() {
  const tbody = document.getElementById("newsTableBody");
  if (!tbody) return;

  try {
    const res = await fetch("/en/api/v1/news/list");
    const data = await res.json();
    const news = data.news || [];

    if (news.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="muted">No news articles yet.</td></tr>';
      return;
    }

    tbody.innerHTML = news
      .map(
        (n) => `
      <tr>
        <td><strong>${n.title}</strong></td>
        <td>${n.author || "Admin"}</td>
        <td>${new Date(n.created_at).toLocaleDateString()}</td>
        <td class="table-actions">
          <button class="btn btn--ghost btn--sm" onclick="editNews('${n.slug}')">Edit</button>
          <a href="/en/news/${n.slug}" class="btn btn--ghost btn--sm" target="_blank">View</a>
          <button class="btn btn--danger btn--sm" onclick="deleteNewsArticle('${n.slug}')">Delete</button>
        </td>

      </tr>
    `
      )
      .join("");
  } catch {
    tbody.innerHTML = '<tr><td colspan="4" class="muted">Failed to load.</td></tr>';
  }
}

function initNewsForm() {
  const form = document.getElementById("newsForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("newsFormAlert");
    if (alertEl) alertEl.style.display = "none";

    const formData = new FormData(form);
    const isEdit = formData.get("id") ? true : false;
    const endpoint = isEdit ? "/en/api/v1/news/update" : "/en/api/v1/news/create";
    const payload = {
      slug: formData.get("slug"),
      title: formData.get("title"),
      content: formData.get("content"),
      author: formData.get("author") || "Admin",
      seo_title: formData.get("seo_title") || null,
      seo_description: formData.get("seo_description") || null,
      author_id: formData.get("author_id") ? parseInt(formData.get("author_id")) : null,
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        if (alertEl) {
          alertEl.className = "alert alert--success";
          alertEl.textContent = isEdit ? "Article updated!" : "News article created!";
          alertEl.style.display = "block";
        }
        form.reset();
        form.querySelector("[name='id']").value = "";
        document.getElementById("newsSubmitBtn").textContent = "Create Article";
        document.getElementById("newsCancelEdit").style.display = "none";
        loadNewsTable();
      } else {
        if (alertEl) {
          alertEl.className = "alert alert--error";
          alertEl.textContent = data.error || "Failed";
          alertEl.style.display = "block";
        }
      }
    } catch {
      if (alertEl) {
        alertEl.className = "alert alert--error";
        alertEl.textContent = "Network error";
        alertEl.style.display = "block";
      }
    }
  });
}

// ============================================
// PAGES
// ============================================

async function loadPagesTable() {
  const tbody = document.getElementById("pagesTableBody");
  if (!tbody) return;

  try {
    const res = await fetch("/en/api/v1/pages/list");
    const data = await res.json();
    const pages = data.pages || [];

    if (pages.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="muted">No pages yet.</td></tr>';
      return;
    }

    tbody.innerHTML = pages
      .map(
        (p) => `
      <tr>
        <td><strong>${p.title}</strong></td>
        <td>${p.slug}</td>
        <td>${p.type}</td>
        <td class="table-actions">
          <button class="btn btn--ghost btn--sm" onclick="editPage('${p.slug}')">Edit</button>
          <a href="/en/${p.slug}" class="btn btn--ghost btn--sm" target="_blank">View</a>
          <button class="btn btn--danger btn--sm" onclick="deletePage('${p.slug}')">Delete</button>
        </td>

      </tr>
    `
      )
      .join("");
  } catch {
    tbody.innerHTML = '<tr><td colspan="4" class="muted">Failed to load.</td></tr>';
  }
}

function initPageForm() {
  const form = document.getElementById("pageForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("pageFormAlert");
    if (alertEl) alertEl.style.display = "none";

    const formData = new FormData(form);
    const isEdit = formData.get("id") ? true : false;
    const endpoint = isEdit ? "/en/api/v1/page/update" : "/en/api/v1/page/create";
    const payload = {
      slug: formData.get("slug"),
      type: formData.get("type") || "page",
      template: formData.get("template") || "page",
      title: formData.get("title"),
      content_json: formData.get("content_json") || {},
      seo_title: formData.get("seo_title") || null,
      seo_description: formData.get("seo_description") || null,
      author_id: formData.get("author_id") ? parseInt(formData.get("author_id")) : null,
    };

    // Try to parse content_json if it's a string
    if (typeof payload.content_json === "string") {
      try {
        payload.content_json = JSON.parse(payload.content_json);
      } catch {
        payload.content_json = { text: payload.content_json };
      }
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        if (alertEl) {
          alertEl.className = "alert alert--success";
          alertEl.textContent = isEdit ? "Page updated!" : "Page created!";
          alertEl.style.display = "block";
        }
        form.reset();
        form.querySelector("[name='id']").value = "";
        document.getElementById("pageSubmitBtn").textContent = "Create Page";
        document.getElementById("pageCancelEdit").style.display = "none";
        loadPagesTable();
      } else {
        if (alertEl) {
          alertEl.className = "alert alert--error";
          alertEl.textContent = data.error || "Failed";
          alertEl.style.display = "block";
        }
      }
    } catch {
      if (alertEl) {
        alertEl.className = "alert alert--error";
        alertEl.textContent = "Network error";
        alertEl.style.display = "block";
      }
    }
  });
}

// ============================================
// SETTINGS
// ============================================

async function loadSettingsForm() {
  const form = document.getElementById("settingsForm");
  if (!form) return;

  try {
    const res = await fetch("/en/api/v1/settings/get");
    const data = await res.json();
    const settings = data.settings || {};

    for (const [key, value] of Object.entries(settings)) {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) input.value = value;
    }
  } catch {
    console.error("Failed to load settings");
  }
}

function initSettingsForm() {
  const form = document.getElementById("settingsForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("settingsFormAlert");
    if (alertEl) alertEl.style.display = "none";

    const formData = new FormData(form);
    const payload = {};

    for (const [key, value] of formData.entries()) {
      payload[key] = value;
    }

    try {
      const res = await fetch("/en/api/v1/settings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        if (alertEl) {
          alertEl.className = "alert alert--success";
          alertEl.textContent = "Settings saved!";
          alertEl.style.display = "block";
        }
      } else {
        if (alertEl) {
          alertEl.className = "alert alert--error";
          alertEl.textContent = data.error || "Failed";
          alertEl.style.display = "block";
        }
      }
    } catch {
      if (alertEl) {
        alertEl.className = "alert alert--error";
        alertEl.textContent = "Network error";
        alertEl.style.display = "block";
      }
    }
  });
}

// ============================================
// AI GENERATOR
// ============================================

function initAIGenerator() {
  const form = document.getElementById("aiForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("aiAlert");
    const outputEl = document.getElementById("aiOutput");
    const submitBtn = form.querySelector('button[type="submit"]');

    if (alertEl) alertEl.style.display = "none";
    if (outputEl) outputEl.value = "Generating... please wait.";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Generating...";
    }

    const formData = new FormData(form);
    const payload = {
      casino: formData.get("casino"),
      country: formData.get("country") || "Global",
      slug: formData.get("slug") || formData.get("casino").toLowerCase().replace(/\s+/g, "-"),
    };

    try {
      const res = await fetch("/en/api/v1/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        if (outputEl) outputEl.value = data.content || "No content returned.";
        if (alertEl) {
          alertEl.className = "alert alert--success";
          alertEl.textContent = "Review generated! Copy the content below.";
          alertEl.style.display = "block";
        }
      } else {
        if (outputEl) outputEl.value = "";
        if (alertEl) {
          alertEl.className = "alert alert--error";
          alertEl.textContent = data.error || "Generation failed";
          alertEl.style.display = "block";
        }
      }
    } catch {
      if (outputEl) outputEl.value = "";
      if (alertEl) {
        alertEl.className = "alert alert--error";
        alertEl.textContent = "Network error. Try again.";
        alertEl.style.display = "block";
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Generate Review";
      }
    }
  });
}



// ============================================
// CATEGORIES
// ============================================

async function loadCategoriesTable() {
  const tbody = document.getElementById("categoriesTableBody");
  if (!tbody) return;
  try {
    const res = await fetch("/en/api/v1/categories/list");
    const data = await res.json();
    const cats = data.categories || [];
    if (cats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="muted">No categories yet.</td></tr>';
      return;
    }
    tbody.innerHTML = cats.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.slug}</td>
        <td>${c.description || ""}</td>
        <td class="table-actions">
          <button class="btn btn--ghost btn--sm" onclick="editCategory(${c.id})">Edit</button>
          <button class="btn btn--danger btn--sm" onclick="deleteCategory('${c.slug}')">Delete</button>
        </td>

      </tr>
    `).join("");
  } catch {
    tbody.innerHTML = '<tr><td colspan="4" class="muted">Failed to load.</td></tr>';
  }
}

async function deleteCategory(slug) {
  if (!confirm(`Delete category "${slug}"?`)) return;
  try {
    const res = await fetch("/en/api/v1/category/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const data = await res.json();
    if (data.success) loadCategoriesTable();
    else alert(data.error || "Delete failed");
  } catch { alert("Network error"); }
}

function initCategoryForm() {
  const form = document.getElementById("categoryForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("categoryFormAlert");
    if (alertEl) alertEl.style.display = "none";
    const formData = new FormData(form);
    const isEdit = formData.get("id") ? true : false;
    const endpoint = isEdit ? "/en/api/v1/category/update" : "/en/api/v1/category/create";
    const payload = {
      id: formData.get("id") ? parseInt(formData.get("id")) : null,
      slug: formData.get("slug"),
      name: formData.get("name"),
      description: formData.get("description") || null,
      seo_title: formData.get("seo_title") || null,
      seo_description: formData.get("seo_description") || null,
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        if (alertEl) {
          alertEl.className = "alert alert--success";
          alertEl.textContent = isEdit ? "Category updated!" : "Category created!";
          alertEl.style.display = "block";
        }
        form.reset();
        form.querySelector("[name='id']").value = "";
        document.getElementById("categorySubmitBtn").textContent = "Create Category";
        document.getElementById("categoryCancelEdit").style.display = "none";
        loadCategoriesTable();
      } else {
        if (alertEl) { alertEl.className = "alert alert--error"; alertEl.textContent = data.error || "Failed"; alertEl.style.display = "block"; }
      }
    } catch {
      if (alertEl) { alertEl.className = "alert alert--error"; alertEl.textContent = "Network error"; alertEl.style.display = "block"; }
    }
  });
}

// ============================================
// COUNTRIES
// ============================================

async function loadCountriesTable() {
  const tbody = document.getElementById("countriesTableBody");
  if (!tbody) return;
  try {
    const res = await fetch("/en/api/v1/countries/list");
    const data = await res.json();
    const countriesList = data.countries || [];
    if (countriesList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="muted">No countries yet.</td></tr>';
      return;
    }
    tbody.innerHTML = countriesList.map(c => `
      <tr>
        <td><strong>${c.code}</strong></td>
        <td>${c.name}</td>
        <td>${c.currency || "—"}</td>
        <td>${c.legal_status || "—"}</td>
        <td class="table-actions">
          <button class="btn btn--ghost btn--sm" onclick="editCountry('${c.code}')">Edit</button>
          <button class="btn btn--danger btn--sm" onclick="deleteCountry('${c.code}')">Delete</button>
        </td>

      </tr>
    `).join("");
  } catch {
    tbody.innerHTML = '<tr><td colspan="5" class="muted">Failed to load.</td></tr>';
  }
}

async function deleteCountry(code) {
  if (!confirm(`Delete country "${code}"?`)) return;
  try {
    const res = await fetch("/en/api/v1/country/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (data.success) loadCountriesTable();
    else alert(data.error || "Delete failed");
  } catch { alert("Network error"); }
}

function initCountryForm() {
  const form = document.getElementById("countryForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("countryFormAlert");
    if (alertEl) alertEl.style.display = "none";
    const formData = new FormData(form);

    const isEdit = form.dataset.editMode === "true";
    const endpoint = isEdit ? "/en/api/v1/country/update" : "/en/api/v1/country/create";
    const payload = {
      code: formData.get("code"),
      name: formData.get("name"),
      currency: formData.get("currency") || null,
      language: formData.get("language") || null,
      legal_status: formData.get("legal_status") || null,
      seo_title: formData.get("seo_title") || null,
      seo_description: formData.get("seo_description") || null,
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        if (alertEl) {
          alertEl.className = "alert alert--success";
          alertEl.textContent = isEdit ? "Country updated!" : "Country created!";
          alertEl.style.display = "block";
        }
        form.reset();
        form.querySelector("[name='code']").readOnly = false;
        delete form.dataset.editMode;
        document.getElementById("countrySubmitBtn").textContent = "Create Country";
        document.getElementById("countryCancelEdit").style.display = "none";
        loadCountriesTable();
      } else {
        if (alertEl) { alertEl.className = "alert alert--error"; alertEl.textContent = data.error || "Failed"; alertEl.style.display = "block"; }
      }
    } catch {
      if (alertEl) { alertEl.className = "alert alert--error"; alertEl.textContent = "Network error"; alertEl.style.display = "block"; }
    }
  });
}

async function deleteReview(slug) {
  if (!confirm(`Delete review "${slug}"?`)) return;
  try {
    const res = await fetch("/en/api/v1/review/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const data = await res.json();
    if (data.success) loadReviewsTable();
    else alert(data.error || "Delete failed");
  } catch { alert("Network error"); }
}


async function deletePage(slug) {
  if (!confirm(`Delete page "${slug}"?`)) return;
  try {
    const res = await fetch("/en/api/v1/page/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const data = await res.json();
    if (data.success) loadPagesTable();
    else alert(data.error || "Delete failed");
  } catch { alert("Network error"); }
}

async function deleteNewsArticle(slug) {
  if (!confirm(`Delete news article "${slug}"?`)) return;
  try {
    const res = await fetch("/en/api/v1/news/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const data = await res.json();
    if (data.success) loadNewsTable();
    else alert(data.error || "Delete failed");
  } catch { alert("Network error"); }
}


// ── Review Edit ──

async function editReview(slug) {
  try {
    const res = await fetch("/en/api/v1/reviews/list");
    const data = await res.json();
    const review = (data.reviews || []).find(r => r.slug === slug);
    if (!review) return;
    const form = document.getElementById("reviewForm");
    form.querySelector("[name='id']").value = review.id;
    form.querySelector("[name='slug']").value = review.slug;
    form.querySelector("[name='casino_slug']").value = review.casino_slug || "";
    form.querySelector("[name='country_code']").value = review.country_code || "";
    form.querySelector("[name='rating']").value = review.rating || 0;
    form.querySelector("[name='title']").value = review.title;
    form.querySelector("[name='content']").value = review.content || "";
    setTimeout(() => {
      RichEditor.set("review-overview", review.content || "");
    }, 300); 
    let pros = [];
    try { pros = JSON.parse(review.pros || "[]"); } catch {}
    form.querySelector("[name='pros']").value = pros.join("\n");
    let cons = [];
    try { cons = JSON.parse(review.cons || "[]"); } catch {}
    form.querySelector("[name='cons']").value = cons.join("\n");
    form.querySelector("[name='seo_title']").value = review.seo_title || "";
    form.querySelector("[name='seo_description']").value = review.seo_description || "";
        // Set author dropdown
    const authorSelect = form.querySelector("[name='author_id']");
    if (authorSelect) authorSelect.value = review.author_id || "";

    document.getElementById("reviewSubmitBtn").textContent = "Update Review";
    document.getElementById("reviewCancelEdit").style.display = "";
    window.scrollTo({ top: form.offsetTop - 100, behavior: "smooth" });
  } catch { alert("Failed to load review"); }
}

function cancelReviewEdit() {
  const form = document.getElementById("reviewForm");
  form.reset();
  form.querySelector("[name='id']").value = "";
  document.getElementById("reviewSubmitBtn").textContent = "Create Review";
  document.getElementById("reviewCancelEdit").style.display = "none";
  RichEditor.set("review-overview", "");
}


// ── News Edit ──

async function editNews(slug) {
  try {
    const res = await fetch("/en/api/v1/news/list");
    const data = await res.json();
    const article = (data.news || []).find(n => n.slug === slug);
    if (!article) return;
    const form = document.getElementById("newsForm");
    form.querySelector("[name='id']").value = article.id;
    form.querySelector("[name='slug']").value = article.slug;
    form.querySelector("[name='author']").value = article.author || "Admin";
    form.querySelector("[name='title']").value = article.title;
    form.querySelector("[name='content']").value = article.content || "";
    setTimeout(() => {
      RichEditor.set("news-content", article.content || "");
    }, 300);
    form.querySelector("[name='seo_title']").value = article.seo_title || "";
    form.querySelector("[name='seo_description']").value = article.seo_description || "";
        // Set author dropdown
    const authorSelect = form.querySelector("[name='author_id']");
    if (authorSelect) authorSelect.value = article.author_id || "";

    document.getElementById("newsSubmitBtn").textContent = "Update Article";
    document.getElementById("newsCancelEdit").style.display = "";
    window.scrollTo({ top: form.offsetTop - 100, behavior: "smooth" });
  } catch { alert("Failed to load article"); }
}

function cancelNewsEdit() {
  const form = document.getElementById("newsForm");
  form.reset();
  form.querySelector("[name='id']").value = "";
  document.getElementById("newsSubmitBtn").textContent = "Create Article";
  document.getElementById("newsCancelEdit").style.display = "none";
  RichEditor.set("news-content", "");
}



// ── Page Edit ──

async function editPage(slug) {
  try {
    const res = await fetch("/en/api/v1/pages/list");
    const data = await res.json();
    const page = (data.pages || []).find(p => p.slug === slug);
    if (!page) return;
    const form = document.getElementById("pageForm");
    form.querySelector("[name='id']").value = page.id;
    form.querySelector("[name='slug']").value = page.slug;
    form.querySelector("[name='type']").value = page.type || "page";
    form.querySelector("[name='template']").value = page.template || "page";
    form.querySelector("[name='title']").value = page.title;
    form.querySelector("[name='content_json']").value = page.content_json || "";
    form.querySelector("[name='seo_title']").value = page.seo_title || "";
    form.querySelector("[name='seo_description']").value = page.seo_description || "";
        // Set author dropdown
    const authorSelect = form.querySelector("[name='author_id']");
    if (authorSelect) authorSelect.value = page.author_id || "";

    document.getElementById("pageSubmitBtn").textContent = "Update Page";
    document.getElementById("pageCancelEdit").style.display = "";
    window.scrollTo({ top: form.offsetTop - 100, behavior: "smooth" });
  } catch { alert("Failed to load page"); }
}

function cancelPageEdit() {
  const form = document.getElementById("pageForm");
  form.reset();
  form.querySelector("[name='id']").value = "";
  document.getElementById("pageSubmitBtn").textContent = "Create Page";
  document.getElementById("pageCancelEdit").style.display = "none";
}


// ── Category Edit ──

async function editCategory(id) {
  try {
    const res = await fetch(`/en/api/v1/category/get-by-id?id=${id}`);
    const data = await res.json();
    if (!data.success) return;
    const c = data.category;
    const form = document.getElementById("categoryForm");
    form.querySelector("[name='id']").value = c.id;
    form.querySelector("[name='slug']").value = c.slug;
    form.querySelector("[name='name']").value = c.name;
    form.querySelector("[name='description']").value = c.description || "";
    form.querySelector("[name='seo_title']").value = c.seo_title || "";
    form.querySelector("[name='seo_description']").value = c.seo_description || "";
    document.getElementById("categorySubmitBtn").textContent = "Update Category";
    document.getElementById("categoryCancelEdit").style.display = "";
    window.scrollTo({ top: form.offsetTop - 100, behavior: "smooth" });
  } catch { alert("Failed to load category"); }
}

function cancelCategoryEdit() {
  const form = document.getElementById("categoryForm");
  form.reset();
  form.querySelector("[name='id']").value = "";
  document.getElementById("categorySubmitBtn").textContent = "Create Category";
  document.getElementById("categoryCancelEdit").style.display = "none";
}

// ── Country Edit ──
async function editCountry(code) {
  try {
    const res = await fetch(`/en/api/v1/country/get-by-code?code=${code}`);
    const data = await res.json();
    if (!data.success) return;
    const c = data.country;
    const form = document.getElementById("countryForm");
    form.querySelector("[name='code']").value = c.code;
    form.querySelector("[name='code']").readOnly = true; // Prevent changing primary key
    form.querySelector("[name='name']").value = c.name;
    form.querySelector("[name='currency']").value = c.currency || "";
    form.querySelector("[name='language']").value = c.language || "";
    form.querySelector("[name='legal_status']").value = c.legal_status || "";
    form.querySelector("[name='seo_title']").value = c.seo_title || "";
    form.querySelector("[name='seo_description']").value = c.seo_description || "";
    document.getElementById("countrySubmitBtn").textContent = "Update Country";
    document.getElementById("countryCancelEdit").style.display = "";
    form.dataset.editMode = "true";
    window.scrollTo({ top: form.offsetTop - 100, behavior: "smooth" });
  } catch { alert("Failed to load country"); }
}
function cancelCountryEdit() {
  const form = document.getElementById("countryForm");
  form.reset();
  form.querySelector("[name='code']").readOnly = false;
  delete form.dataset.editMode;
  document.getElementById("countrySubmitBtn").textContent = "Create Country";
  document.getElementById("countryCancelEdit").style.display = "none";
}
