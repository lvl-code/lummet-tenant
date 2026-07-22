document.addEventListener("DOMContentLoaded", async () => {
  try {
    const profile = await fetch("/en/api/v1/user/profile");
    if (!profile.ok) return;
    const data = await profile.json();
    const user = data.user;
    if (!user) return;

    // Admin sees everything
    if (user.role === "admin") return;

    const res = await fetch("/en/api/v1/permissions/list");
    const permData = await res.json();
    const permissions = permData.permissions || {};
    const rolePermissions = permissions[user.role] || {};

    const links = document.querySelectorAll(".admin-nav a");

    // Resource → nav URL mapping
    const map = {
      "/en/dashboard/casinos": "casinos",
      "/en/dashboard/casino/create": "casinos",
      "/en/dashboard/reviews": "reviews",
      "/en/dashboard/news": "news",
      "/en/dashboard/pages": "pages",
      "/en/dashboard/categories": "categories",
      "/en/dashboard/countries": "countries",
      "/en/dashboard/authors": "authors",
      "/en/dashboard/components": "components",
      "/en/dashboard/seo": "seo",
      "/en/dashboard/media": "media",
      "/en/dashboard/nav": "nav",
      "/en/dashboard/users": "users",
      "/en/dashboard/permissions": "permissions",
      "/en/dashboard/settings": "settings"
    };

    // Admin-only pages (always hidden for non-admins)
    const adminOnly = [
      "/en/dashboard/inquiries",
      "/en/dashboard/submissions",
      "/en/dashboard/notifications",
      "/en/dashboard/banners",
      "/en/dashboard/ai"
    ];

    links.forEach(link => {
      const url = link.getAttribute("href");

      // Hide admin-only pages
      if (adminOnly.includes(url)) {
        link.style.display = "none";
        return;
      }

      // Check resource permission
      const resource = map[url];
      if (!resource) return;

      const allowed = rolePermissions[resource]?.read === true;
      if (!allowed) {
        link.style.display = "none";
      }
    });

  } catch (e) {
    console.error("Permission loader failed", e);
  }
});
