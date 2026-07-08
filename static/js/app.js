// =====================================================
// LEVELCASINO FRONTEND APP
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  initNavToggle();
  initSidebar();
  initHomeNews();
  initHeaderAuth();
});

// ---- Mobile nav toggle ----
function initNavToggle() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    nav.classList.toggle("active");
  });
}

// ---- Sidebar: load top casinos ----
async function initSidebar() {
  const container = document.getElementById("sidebarTopCasinos");
  if (!container) return;

  try {
    const res = await fetch("/en/api/v1/casinos/list");
    const data = await res.json();

    if (!data.casinos || data.casinos.length === 0) {
      container.innerHTML = '<p class="muted">No casinos yet.</p>';
      return;
    }

    const top5 = data.casinos.slice(0, 5);
    container.innerHTML = top5
      .map(
        (c) => `
      <a href="/en/casino/${c.slug}" class="sidebar-casino">
        <img src="${c.logo || "/en/static/images/logo.png"}" alt="${c.name}" onerror="this.src='/en/static/images/logo.png'">
        <div>
          <strong>${c.name}</strong>
          <span class="rating">★ ${c.rating || "N/A"}</span>
        </div>
      </a>
    `
      )
      .join("");
  } catch {
    container.innerHTML = '<p class="muted">Failed to load.</p>';
  }
}

// ---- Homepage: load latest news ----
async function initHomeNews() {
  const container = document.getElementById("homeNews");
  if (!container) return;

  try {
    const res = await fetch("/en/api/v1/news/list");
    const data = await res.json();

    if (!data.news || data.news.length === 0) {
      container.innerHTML = '<p class="muted">No news articles yet.</p>';
      return;
    }

    const top3 = data.news.slice(0, 3);
    container.innerHTML = top3
      .map(
        (n) => `
      <a href="/en/news/${n.slug}" class="news-card">
        <h3>${n.title}</h3>
        <p>${(n.content || "").substring(0, 120)}...</p>
        <span class="news-date">${new Date(n.created_at).toLocaleDateString()}</span>
      </a>
    `
      )
      .join("");
  } catch {
    container.innerHTML = '<p class="muted">Failed to load news.</p>';
  }
}


async function initHeaderAuth() {
  try {
    const res = await fetch("/api/v1/dashboard");
    if (res.ok) {
      const loginBtn = document.getElementById("headerLoginBtn");
      const logoutBtn = document.getElementById("headerLogoutBtn");
      const dashBtn = document.getElementById("headerDashboardBtn");
      if (loginBtn) loginBtn.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "";
      if (dashBtn) dashBtn.style.display = "";
    }
  } catch {
    // Not logged in — keep login button visible
  }
}
