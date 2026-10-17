async function loadPlatformUpdatesTable() {
const tbody = document.getElementById("updatesTableBody");

if (!tbody) return;

try {
const res = await fetch(
"/en/api/v1/platform-updates/list"
);

const data = await res.json();

if (!res.ok || !data.success) {
  throw new Error(
    data.error || "Failed to load platform updates."
  );
}

const updates = data.updates || [];

if (!updates.length) {
  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="muted">
        No platform updates yet.
      </td>
    </tr>
  `;

  return;
}

tbody.innerHTML = updates.map(update => {

  const published = Number(update.published) === 1;
  const featured = Number(update.featured) === 1;

  const dateValue =
    update.published_at ||
    update.created_at;

  const date = dateValue
    ? new Date(dateValue).toLocaleDateString()
    : "—";

  const author =
    update.author_name ||
    "No author";

  return `
    <tr>

      <td>
        <strong>
          ${escapeHtml(update.title || "Untitled")}
        </strong>

        <div class="muted">
          /updates/${escapeHtml(update.slug || "")}
        </div>
      </td>

      <td>
        ${escapeHtml(author)}
      </td>

      <td>
        ${
          published
            ? '<span class="status status--success">Published</span>'
            : '<span class="status status--muted">Draft</span>'
        }
      </td>

      <td>
        ${
          featured
            ? '<span class="status status--success">Featured</span>'
            : '<span class="muted">No</span>'
        }
      </td>

      <td>
        ${escapeHtml(date)}
      </td>

      <td class="table-actions">

        ${
          published
            ? `
              <a
                href="/en/updates/${encodeURIComponent(update.slug)}"
                class="btn btn--ghost btn--sm"
                target="_blank"
                rel="noopener"
              >
                View
              </a>
            `
            : ""
        }

        <button
          type="button"
          class="btn btn--ghost btn--sm"
          onclick="editPlatformUpdate(${Number(update.id)})"
        >
          Edit
        </button>

        <button
          type="button"
          class="btn btn--danger btn--sm"
          onclick="deletePlatformUpdate(${Number(update.id)})"
        >
          Delete
        </button>

      </td>

    </tr>
  `;
}).join("");

} catch (error) {

console.error(
  "Failed to load platform updates:",
  error
);

tbody.innerHTML = `
  <tr>
    <td colspan="6" class="muted">
      Failed to load platform updates.
    </td>
  </tr>
`;

}
}

/* =========================================================
INITIALIZE FORM
========================================================= */

// ── Platform Update Featured Image (media_library FK, picked via Media Library) ──────
function openUpdateFeaturedImagePicker() {
  if (!window.MediaPicker || typeof window.MediaPicker.openImagePicker !== "function") {
    alert("Media Library is not available. Make sure media-picker.js is loaded.");
    return;
  }
  window.MediaPicker.openImagePicker(function(media) {
    if (!media || !media.id) return;
    setUpdateFeaturedImage(media.id, media.url || media.thumbnail_url || "", media.alt_text || "");
  }, "updates");
}

function setUpdateFeaturedImage(id, url, alt) {
  const idInput = document.getElementById("updateFeaturedImage");
  const imgEl = document.getElementById("updateFeaturedImageImg");
  const preview = document.getElementById("updateFeaturedImagePreview");
  const selectBtn = document.getElementById("updateSelectFeaturedImage");

  if (idInput) idInput.value = String(id);
  if (imgEl) { imgEl.src = url; imgEl.alt = alt; }
  if (preview) preview.style.display = url ? "block" : "none";
  if (selectBtn) selectBtn.style.display = url ? "none" : "";
}

function clearUpdateFeaturedImage() {
  const idInput = document.getElementById("updateFeaturedImage");
  const imgEl = document.getElementById("updateFeaturedImageImg");
  const preview = document.getElementById("updateFeaturedImagePreview");
  const selectBtn = document.getElementById("updateSelectFeaturedImage");

  if (idInput) idInput.value = "";
  if (imgEl) { imgEl.src = ""; imgEl.alt = ""; }
  if (preview) preview.style.display = "none";
  if (selectBtn) selectBtn.style.display = "";
}

function initPlatformUpdateForm() {
const form =
document.getElementById("platformUpdateForm");

if (!form) return;

const ogSelectBtn = document.getElementById("updateSelectFeaturedImage");
const ogChangeBtn = document.getElementById("updateChangeFeaturedImage");
const ogRemoveBtn = document.getElementById("updateRemoveFeaturedImage");
if (ogSelectBtn) ogSelectBtn.addEventListener("click", openUpdateFeaturedImagePicker);
if (ogChangeBtn) ogChangeBtn.addEventListener("click", openUpdateFeaturedImagePicker);
if (ogRemoveBtn) ogRemoveBtn.addEventListener("click", clearUpdateFeaturedImage);

form.addEventListener(
"submit",
async function(event) {

  event.preventDefault();

  const alertEl =
    document.getElementById(
      "platformUpdateFormAlert"
    );

  if (alertEl) {
    alertEl.style.display = "none";
  }

  const formData =
    new FormData(form);

  const id =
    formData.get("id");

  const isEdit =
    Boolean(id);

  const endpoint =
    isEdit
      ? "/en/api/v1/platform-updates/update"
      : "/en/api/v1/platform-updates/create";

  const payload = {
    id: id
      ? Number(id)
      : null,

    slug:
      String(
        formData.get("slug") || ""
      ).trim(),

    title:
      String(
        formData.get("title") || ""
      ).trim(),

    excerpt:
      String(
        formData.get("excerpt") || ""
      ).trim() || null,

    content:
      formData.get("content") || "",

    featured_image:
      formData.get("featured_image")
        ? Number(formData.get("featured_image"))
        : null,

    seo_title:
      String(
        formData.get("seo_title") || ""
      ).trim() || null,

    seo_description:
      String(
        formData.get("seo_description") || ""
      ).trim() || null,

    seo_keywords:
      String(
        formData.get("seo_keywords") || ""
      ).trim() || null,

    author_id:
      formData.get("author_id")
        ? Number(formData.get("author_id"))
        : null,

    published:
      Number(
        formData.get("published") || 0
      ),

    featured:
      Number(
        formData.get("featured") || 0
      ),

    published_at:
      formData.get("published_at")
        || null
  };

  if (!payload.slug) {
    showPlatformUpdateAlert(
      "Slug is required.",
      "error"
    );
    return;
  }

  if (!payload.title) {
    showPlatformUpdateAlert(
      "Title is required.",
      "error"
    );
    return;
  }

  if (!payload.content.trim()) {
    showPlatformUpdateAlert(
      "Content is required.",
      "error"
    );
    return;
  }

  const submitBtn =
    document.getElementById(
      "platformUpdateSubmitBtn"
    );

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent =
      isEdit
        ? "Saving..."
        : "Creating...";
  }

  try {

    const res = await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(payload)
      }
    );

    const data =
      await res.json();

    if (!res.ok || !data.success) {
      throw new Error(
        data.error ||
        "Failed to save platform update."
      );
    }

    showPlatformUpdateAlert(
      isEdit
        ? "Platform update updated successfully."
        : "Platform update created successfully.",
      "success"
    );

    resetPlatformUpdateForm();

    await loadPlatformUpdatesTable();

  } catch (error) {

    console.error(
      "Platform update save error:",
      error
    );

    showPlatformUpdateAlert(
      error.message ||
      "Failed to save platform update.",
      "error"
    );

  } finally {

    if (submitBtn) {
      submitBtn.disabled = false;

      submitBtn.textContent =
        "Create Update";
    }
  }
}

);
}

/* =========================================================
EDIT
========================================================= */

async function editPlatformUpdate(id) {

try {

const res = await fetch(
  "/en/api/v1/platform-updates/list"
);

const data =
  await res.json();

if (!res.ok || !data.success) {
  throw new Error(
    data.error ||
    "Failed to load platform updates."
  );
}

const update =
  (data.updates || [])
    .find(
      item =>
        Number(item.id) === Number(id)
    );

if (!update) {
  showPlatformUpdateAlert(
    "Platform update not found.",
    "error"
  );

  return;
}

const form =
  document.getElementById(
    "platformUpdateForm"
  );

if (!form) return;


form.dataset.id =
  String(update.id);


form.querySelector(
  "[name='id']"
).value =
  update.id;


form.querySelector(
  "[name='slug']"
).value =
  update.slug || "";


form.querySelector(
  "[name='title']"
).value =
  update.title || "";


form.querySelector(
  "[name='excerpt']"
).value =
  update.excerpt || "";


form.querySelector(
  "[name='content']"
).value =
  update.content || "";


if (update.featured_image && (update.featured_image_url || update.featured_image_thumbnail)) {
  setUpdateFeaturedImage(
    update.featured_image,
    update.featured_image_url || update.featured_image_thumbnail,
    update.featured_image_alt || update.title || "Featured image"
  );
} else {
  clearUpdateFeaturedImage();
}


form.querySelector(
  "[name='seo_title']"
).value =
  update.seo_title || "";


form.querySelector(
  "[name='seo_description']"
).value =
  update.seo_description || "";


form.querySelector(
  "[name='seo_keywords']"
).value =
  update.seo_keywords || "";


form.querySelector(
  "[name='author_id']"
).value =
  update.author_id || "";


form.querySelector(
  "[name='published']"
).value =
  Number(update.published) === 1
    ? "1"
    : "0";


form.querySelector(
  "[name='featured']"
).value =
  Number(update.featured) === 1
    ? "1"
    : "0";


const publishedAt =
  form.querySelector(
    "[name='published_at']"
  );

if (publishedAt) {

  publishedAt.value =
    formatDateTimeLocal(
      update.published_at
    );
}


const title =
  document.getElementById(
    "updatesFormTitle"
  );

if (title) {
  title.textContent =
    "Edit Platform Update";
}


const submitBtn =
  document.getElementById(
    "platformUpdateSubmitBtn"
  );

if (submitBtn) {
  submitBtn.textContent =
    "Save Changes";
}


const cancelBtn =
  document.getElementById(
    "platformUpdateCancelBtn"
  );

if (cancelBtn) {
  cancelBtn.style.display =
    "inline-flex";
}

setTimeout(() => {
  RichEditor.set(
    "platform-update-content",
    update.content || ""
  );
}, 300);


form.scrollIntoView({
  behavior: "smooth",
  block: "start"
});

} catch (error) {

console.error(
  "Platform update edit error:",
  error
);

showPlatformUpdateAlert(
  error.message ||
  "Failed to load platform update.",
  "error"
);

}
}

/* =========================================================
DELETE
========================================================= */

async function deletePlatformUpdate(id) {

if (!confirm(
"Delete this platform update permanently?"
)) {
return;
}

try {

const res = await fetch(
  "/en/api/v1/platform-updates/delete",
  {
    method: "POST",

    headers: {
      "Content-Type":
        "application/json"
    },

    body:
      JSON.stringify({
        id: Number(id)
      })
  }
);

const data =
  await res.json();

if (!res.ok || !data.success) {
  throw new Error(
    data.error ||
    "Delete failed."
  );
}

await loadPlatformUpdatesTable();

showPlatformUpdateAlert(
  "Platform update deleted.",
  "success"
);

} catch (error) {

console.error(
  "Platform update delete error:",
  error
);

showPlatformUpdateAlert(
  error.message ||
  "Failed to delete platform update.",
  "error"
);

}
}

/* =========================================================
CANCEL EDIT
========================================================= */

function cancelPlatformUpdateEdit() {
resetPlatformUpdateForm();
}

/* =========================================================
RESET FORM
========================================================= */

function resetPlatformUpdateForm() {

const form =
document.getElementById(
"platformUpdateForm"
);

if (!form) return;

form.reset();

clearUpdateFeaturedImage();

form.dataset.id = "";

const id =
form.querySelector(
"[name='id']"
);

if (id) {
id.value = "";
}

const title =
document.getElementById(
"updatesFormTitle"
);

if (title) {
title.textContent =
"Add Platform Update";
}

const submitBtn =
document.getElementById(
"platformUpdateSubmitBtn"
);

if (submitBtn) {
submitBtn.textContent =
"Create Update";
}

const cancelBtn =
document.getElementById(
"platformUpdateCancelBtn"
);

if (cancelBtn) {
cancelBtn.style.display =
"none";
}

const alertEl =
document.getElementById(
"platformUpdateFormAlert"
);

if (alertEl) {
alertEl.style.display =
"none";
}
}

/* =========================================================
ALERT
========================================================= */
function showPlatformUpdateAlert(message, type = "error") {
  const alertEl = document.getElementById(
    "platformUpdateFormAlert"
  );

  if (!alertEl) return;

  alertEl.className =
    type === "success"
      ? "alert alert--success"
      : "alert alert--error";

  alertEl.textContent = message;
  alertEl.style.display = "block";

  clearTimeout(window.platformUpdateAlertTimer);

  window.platformUpdateAlertTimer = setTimeout(() => {
    alertEl.style.display = "none";
  }, 5000);
}

/* =========================================================
DATETIME HELPER
========================================================= */

function formatDateTimeLocal(value) {

if (!value) return "";

const date =
new Date(value);

if (Number.isNaN(date.getTime())) {
return "";
}

const pad =
number =>
String(number).padStart(2, "0");

return (
date.getFullYear() +
"-" +
pad(date.getMonth() + 1) +
"-" +
pad(date.getDate()) +
"T" +
pad(date.getHours()) +
":" +
pad(date.getMinutes())
);
}
