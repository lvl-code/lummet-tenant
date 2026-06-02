(function() {

    const path = window.location.pathname
        .replace(/\/$/, '')
        .split('/')
        .filter(Boolean);

    const baseUrl = "https://level.casino";

    let breadcrumbs = [
        {
            name: "Home",
            url: baseUrl + "/"
        }
    ];

    let currentPath = "";

    path.forEach(segment => {

        currentPath += "/" + segment;

        let label = segment
            .replace(/-/g, " ")
            .replace(/\b\w/g, l => l.toUpperCase());

        if (segment === "casinos") label = "Casinos";
        if (segment === "reviews") label = "Reviews";
        if (segment === "news") label = "News";
        if (segment === "crypto") label = "Crypto";

        breadcrumbs.push({
            name: label,
            url: baseUrl + currentPath + "/"
        });

    });

    const container = document.getElementById("breadcrumbs-container");

    if (container && breadcrumbs.length > 1) {

        container.innerHTML = `
            <nav class="breadcrumbs">
                ${breadcrumbs.map((item, index) => {

                    if (index === breadcrumbs.length - 1) {
                        return item.name;
                    }

                    return `<a href="${item.url}">${item.name}</a>`;
                }).join(" › ")}
            </nav>
        `;
    }

    const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((item, index) => {

        const node = {
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name
        };

        if (index < breadcrumbs.length - 1) {
            node.item = item.url;
        }

        return node;
    })
    };

    const script = document.createElement("script");

    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);

    document.head.appendChild(script);

})();
