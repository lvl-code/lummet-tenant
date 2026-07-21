// =====================================================
// NAVIGATION ADMIN
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  loadNavTable();
  initNavForm();
});

async function loadNavTable() {
  const tbody = document.getElementById("navTableBody");
  if (!tbody) return;

  const filter = document.getElementById("navLocationFilter")?.value || "";
  const url = filter
    ? `/en/api/v1/nav/list?location=${filter}`
    : "/en/api/v1/nav/list";

  try {
    const res = await fetch(url);
    const data = await res.json();
    const items = data.nav || [];

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="muted">No nav items yet.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(n => `
      <tr>
        <td><strong>${n.icon ? n.icon + " " : ""}${n.label}</strong></td>
        <td><a href="${n.url}" target="_blank">${n.url}</a></td>
        <td>${n.location}</td>
        <td>${n.position}</td>
        <td>${n.is_external ? "✓" : "—"}</td>
        <td>${n.enabled ? '<span class="status-badge status-published">Yes</span>' : '<span class="status-badge status-draft">No</span>'}</td>
        <td class="table-actions">
          <button class="btn btn--ghost btn--sm" onclick="editNavItem(${n.id})">Edit</button>
          <button class="btn btn--danger btn--sm" onclick="deleteNavItem(${n.id})">Delete</button>
        </td>
      </tr>
    `).join("");
  } catch {
    tbody.innerHTML = '<tr><td colspan="7" class="muted">Failed to load.</td></tr>';
  }
}

function initNavForm() {
  const form = document.getElementById("navForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("navFormAlert");
    if (alertEl) alertEl.style.display = "none";

    const formData = new FormData(form);
    const isEdit = formData.get("id") ? true : false;
    const endpoint = isEdit ? "/en/api/v1/nav/update" : "/en/api/v1/nav/create";
    const payload = {
      id: formData.get("id") ? parseInt(formData.get("id")) : null,
      label: formData.get("label"),
      url: formData.get("url"),
      location: formData.get("location"),
      position: parseInt(formData.get("position")) || 0,
      is_external: formData.get("is_external") === "1",
      enabled: formData.get("enabled") === "1",
      icon: formData.get("icon") || null,
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
          alertEl.textContent = isEdit ? "Nav item updated!" : "Nav item created!";
          alertEl.style.display = "block";
        }
        form.reset();
        form.querySelector("[name='id']").value = "";
        document.getElementById("navSubmitBtn").textContent = "Add Nav Item";
        document.getElementById("navCancelEdit").style.display = "none";
        loadNavTable();
      } else {
        if (alertEl) { alertEl.className = "alert alert--error"; alertEl.textContent = data.error || "Failed"; alertEl.style.display = "block"; }
      }
    } catch {
      if (alertEl) { alertEl.className = "alert alert--error"; alertEl.textContent = "Network error"; alertEl.style.display = "block"; }
    }
  });
}

async function editNavItem(id) {
  try {
    const res = await fetch("/en/api/v1/nav/list");
    const data = await res.json();
    const item = (data.nav || []).find(n => n.id === id);
    if (!item) return;
    const form = document.getElementById("navForm");
    form.querySelector("[name='id']").value = item.id;
    form.querySelector("[name='label']").value = item.label;
    form.querySelector("[name='url']").value = item.url;
    form.querySelector("[name='location']").value = item.location;
    form.querySelector("[name='position']").value = item.position;
    form.querySelector("[name='is_external']").value = item.is_external ? "1" : "0";
    form.querySelector("[name='enabled']").value = item.enabled ? "1" : "0";
    form.querySelector("[name='icon']").value = item.icon || "";
    document.getElementById("navSubmitBtn").textContent = "Update Nav Item";
    document.getElementById("navCancelEdit").style.display = "";
    window.scrollTo({ top: form.offsetTop - 100, behavior: "smooth" });
  } catch { alert("Failed to load nav item"); }
}

function cancelNavEdit() {
  const form = document.getElementById("navForm");
  form.reset();
  form.querySelector("[name='id']").value = "";
  document.getElementById("navSubmitBtn").textContent = "Add Nav Item";
  document.getElementById("navCancelEdit").style.display = "none";
}

async function deleteNavItem(id) {
  if (!confirm("Delete this nav item?")) return;
  try {
    await fetch("/en/api/v1/nav/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    loadNavTable();
  } catch { alert("Network error"); }
}
