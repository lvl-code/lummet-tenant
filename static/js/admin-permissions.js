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

    const rolePermissions =
      permissions[user.role] || {};


    const links = document.querySelectorAll(
      ".admin-nav a"
    );


    links.forEach(link => {

      const url = link.getAttribute("href");


      const map = {

        "/en/dashboard/casinos":
          "casinos",

        "/en/dashboard/casino/create":
          "casinos",

        "/en/dashboard/reviews":
          "reviews",

        "/en/dashboard/news":
          "news",

        "/en/dashboard/pages":
          "pages",

        "/en/dashboard/categories":
          "categories",

        "/en/dashboard/countries":
          "countries",

        "/en/dashboard/media":
          "media",

        "/en/dashboard/nav":
          "nav",

        "/en/dashboard/users":
          "users",

        "/en/dashboard/permissions":
          "permissions"

      };


      const resource = map[url];


      if (!resource) return;


      const allowed =
        rolePermissions[resource]?.read === true;


      if (!allowed) {

        link.style.display = "none";

      }


    });


  } catch(e){

    console.error(
      "Permission loader failed",
      e
    );

  }

});
