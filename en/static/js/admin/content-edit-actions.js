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
    form.querySelector("[name='id']").value = review.id || review.slug;
    form.querySelector("[name='slug']").value = review.slug;
    form.querySelector("[name='casino_slug']").value = review.casino_slug || "";
    form.querySelector("[name='country_code']").value = review.country_code || "";
    form.querySelector("[name='rating']").value = review.rating || 0;
    form.querySelector("[name='title']").value = review.title;
    form.querySelector("[name='overview']").value = review.overview || "";
    form.querySelector("[name='games']").value = review.games || "";
    form.querySelector("[name='bonuses']").value = review.bonuses || "";
    form.querySelector("[name='payments']").value = review.payments || "";
    form.querySelector("[name='licenses']").value = review.licenses || "";
    form.querySelector("[name='verdict']").value = review.verdict || "";

    form.querySelector("[name='content']").value = review.content || "";
   // setTimeout(() => {
     // RichEditor.set("review-overview", review.content || "");
   // }, 300); 
setTimeout(() => {

  RichEditor.set(
    "review-overview",
    review.overview || ""
  );

  RichEditor.set(
    "review-games",
    review.games || ""
  );

  RichEditor.set(
    "review-bonuses",
    review.bonuses || ""
  );

  RichEditor.set(
    "review-payments",
    review.payments || ""
  );

  RichEditor.set(
    "review-licenses",
    review.licenses || ""
  );

  RichEditor.set(
    "review-verdict",
    review.verdict || ""
  );

  RichEditor.set(
    "review-content",
    review.content || ""
  );

}, 300);

    let pros = [];
    try { pros = JSON.parse(review.pros || "[]"); } catch {}
    form.querySelector("[name='pros']").value = pros.join("\n");
    let cons = [];
    try { cons = JSON.parse(review.cons || "[]"); } catch {}
    form.querySelector("[name='cons']").value = cons.join("\n");
    form.querySelector("[name='faq_json']").value = review.faq_json || "[]";
    form.querySelector("[name='seo_title']").value = review.seo_title || "";
    form.querySelector("[name='seo_description']").value = review.seo_description || "";
    form.querySelector("[name='seo_keywords']").value = review.seo_keywords || "";
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
    form.dataset.slug = article.slug;
    form.querySelector("[name='author']").value = article.author || "Admin";
    form.querySelector("[name='title']").value = article.title;

    const excerptField = form.querySelector("[name='excerpt']");
    if (excerptField) excerptField.value = article.excerpt || "";

    const tagsField = form.querySelector("[name='tags']");
    if (tagsField) tagsField.value = article.tags || "";

    const authorSelect = form.querySelector("[name='author_id']");
    if (authorSelect) authorSelect.value = article.author_id || "";

    form.querySelector("[name='content']").value = article.content || "";
    setTimeout(() => {
      if (window.RichEditor && typeof RichEditor.set === "function") {
        RichEditor.set("news-content", article.content || "");
      }
    }, 300);

    // Featured image
    if (article.featured_image && (article.featured_image_url || article.featured_image_thumbnail)) {
      setNewsFeaturedImage(
        article.featured_image,
        article.featured_image_url || article.featured_image_thumbnail,
        article.featured_image_alt || article.title || "Featured image"
      );
    } else {
      clearNewsFeaturedImage();
    }

    // OG image (optional — independent of Featured Image)
    if (article.og_image && (article.og_image_url || article.og_image_thumbnail)) {
      setNewsOgImage(
        article.og_image,
        article.og_image_url || article.og_image_thumbnail,
        article.og_image_alt || ""
      );
    } else {
      clearNewsOgImage();
    }

    // SEO
    form.querySelector("[name='seo_title']").value = article.seo_title || "";
    form.querySelector("[name='seo_description']").value = article.seo_description || "";
    form.querySelector("[name='seo_keywords']").value = article.seo_keywords || "";

    // Publishing
    const publishedSelect = form.querySelector("[name='published']");
    if (publishedSelect) publishedSelect.value = article.published ? "1" : "0";

    const publishedAtInput = form.querySelector("[name='published_at']");
    if (publishedAtInput) {
      publishedAtInput.value = article.published_at ? toDatetimeLocal(article.published_at) : "";
    }

    const aiGeneratedSelect = form.querySelector("[name='ai_generated']");
    if (aiGeneratedSelect) aiGeneratedSelect.value = article.ai_generated ? "1" : "0";

    document.getElementById("newsSubmitBtn").textContent = "Update Article";
    document.getElementById("newsCancelEdit").style.display = "";
    document.getElementById("newsFormTitle").textContent = "Edit News Article";
    window.scrollTo({ top: form.offsetTop - 100, behavior: "smooth" });
  } catch { alert("Failed to load article"); }
}

function toDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
}


function cancelNewsEdit() {
  const form = document.getElementById("newsForm");
  form.reset();
  form.dataset.slug = "";
  form.querySelector("[name='id']").value = "";
  clearNewsFeaturedImage();
  if (window.RichEditor && typeof RichEditor.set === "function") {
    RichEditor.set("news-content", "");
  }
  document.getElementById("newsSubmitBtn").textContent = "Create Article";
  document.getElementById("newsCancelEdit").style.display = "none";
  document.getElementById("newsFormTitle").textContent = "Add News Article";
}


// ── Page Edit new ──
async function editPage(slug) {
  try {
    const res = await fetch("/en/api/v1/pages/list");
    const data = await res.json();

    const page = (data.pages || []).find(p => p.slug === slug);
    if (!page) return;

    const form = document.getElementById("pageForm");
    if (!form) return;

    // Basic fields
    form.querySelector("[name='id']").value = page.id || "";
    form.querySelector("[name='slug']").value = page.slug || "";
    form.querySelector("[name='type']").value = page.type || "page";
    form.querySelector("[name='template']").value = page.template || "page";
    form.querySelector("[name='title']").value = page.title || "";

    // ==========================================
    // CONTENT
    // Supports old JSON + new HTML
    // ==========================================

    let pageContent = page.content_json || "";

    // If stored as JSON string, parse it
    if (typeof pageContent === "string") {
      const trimmed = pageContent.trim();

      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        try {
          pageContent = JSON.parse(trimmed);
        } catch {
          // Keep as normal HTML/text
        }
      }
    }

    // If old content is an object/array
    if (typeof pageContent === "object" && pageContent !== null) {

      // Most likely old structures
      pageContent =
        pageContent.html ??
        pageContent.content ??
        pageContent.body ??
        pageContent.text ??
        pageContent.value ??
        pageContent.description ??
        "";

      // If the selected value is still an object/array,
      // convert its useful values to editor content
      if (typeof pageContent === "object" && pageContent !== null) {
        pageContent = Array.isArray(pageContent)
          ? pageContent
              .map(item =>
                typeof item === "string"
                  ? item
                  : item.html ||
                    item.content ||
                    item.body ||
                    item.text ||
                    ""
              )
              .filter(Boolean)
              .join("\n")
          : pageContent.html ||
            pageContent.content ||
            pageContent.body ||
            pageContent.text ||
            "";
      }
    }

    // Final safety
    pageContent = String(pageContent || "");

    console.log("Original:", page.content_json);
    console.log("Editor content:", pageContent);

    // Keep textarea/hidden field synchronized
    const contentField = form.querySelector(
      "[name='content_json']"
    );

    if (contentField) {
      contentField.value = pageContent;
    }

    // ==========================================
    // RICH EDITOR
    // ==========================================

    const setEditor = () => {
      if (
        window.RichEditor &&
        typeof RichEditor.set === "function"
      ) {
        RichEditor.set("page-content", pageContent);
      }
    };

    setEditor();
    setTimeout(setEditor, 300);
    setTimeout(setEditor, 800);

    // SEO
    form.querySelector("[name='seo_title']").value =
      page.seo_title || "";

    form.querySelector("[name='seo_description']").value =
      page.seo_description || "";

    form.querySelector("[name='seo_keywords']").value =
      page.seo_keywords || "";

    // Author
    const authorSelect = form.querySelector("[name='author_id']");
    if (authorSelect) {
      authorSelect.value = page.author_id || "";
    }

    // Edit mode
    document.getElementById("pageSubmitBtn").textContent =
      "Update Page";

    document.getElementById("pageCancelEdit").style.display = "";

    window.scrollTo({
      top: form.offsetTop - 100,
      behavior: "smooth"
    });

  } catch (err) {
    console.error("Failed to load page:", err);
    alert("Failed to load page");
  }
}

// ── Page Edit legacy ──


function cancelPageEdit() {
  const form = document.getElementById("pageForm");
  form.reset();
  form.querySelector("[name='id']").value = "";
  document.getElementById("pageSubmitBtn").textContent = "Create Page";
  document.getElementById("pageCancelEdit").style.display = "none";
  RichEditor.set("page-content", "");
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
    setTimeout(() => {
      RichEditor.set("category-description", c.description || "");
    }, 300);
    form.querySelector("[name='seo_title']").value = c.seo_title || "";
    form.querySelector("[name='seo_description']").value = c.seo_description || "";
    form.querySelector("[name='seo_keywords']").value = c.seo_keywords || "";
    form.querySelector("[name='robots']").value = c.robots || "index,follow";
    form.querySelector("[name='status']").value = c.status || "published";
    form.querySelector("[name='published']").value = c.published === 0 ? "0" : "1";

    if (c.og_image && (c.og_image_url)) {
      setCategoryOgImage(c.og_image, c.og_image_url, c.og_image_alt || "");
    } else {
      clearCategoryOgImage();
    }

    let content = {};
    try { content = typeof c.content_json === "string" ? JSON.parse(c.content_json) : (c.content_json || {}); } catch (e) {}
    const state = seoPageState.category;
    state.sections = Array.isArray(content.sections) ? content.sections : [];
    state.categorySlug = c.slug;
    renderSeoSections("category");
    loadCategoryFormEligibleCasinos(c.slug);

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
  RichEditor.set("category-description", "");
  const state = seoPageState.category;
  state.sections = [];
  state.categorySlug = null;
  renderSeoSections("category");
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
    form.querySelector("[name='seo_keywords']").value = c.seo_keywords || "";
    form.querySelector("[name='robots']").value = c.robots || "index,follow";
    form.querySelector("[name='status']").value = c.status || "published";
    form.querySelector("[name='published']").value = c.published === 0 ? "0" : "1";
    form.querySelector("[name='is_featured']").value = c.is_featured === 1 ? "1" : "0";
    form.querySelector("[name='featured_position']").value = c.featured_position ?? 0;
    form.querySelector("[name='tier']").value = c.tier ?? 3;

    if (c.og_image && c.og_image_url) {
      setCountryOgImage(c.og_image, c.og_image_url, c.og_image_alt || "");
    } else {
      clearCountryOgImage();
    }

    let content = {};
    try { content = typeof c.content_json === "string" ? JSON.parse(c.content_json) : (c.content_json || {}); } catch (e) {}
    const state = seoPageState.country;
    state.sections = Array.isArray(content.sections) ? content.sections : [];
    state.countryCode = c.code;
    renderSeoSections("country");
    loadSeoEligibleCasinos("country");

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
  const state = seoPageState.country;
  state.sections = [];
  state.countryCode = "";
  renderSeoSections("country");
}


/* =========================================================
PAYMENT METHODS
========================================================= */

