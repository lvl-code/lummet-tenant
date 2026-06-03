document.addEventListener("DOMContentLoaded", () => {

    console.log("Breadcrumb JS loaded");

    const container = document.getElementById("breadcrumbs-container");

    if (!container) {
        console.warn("Breadcrumb container not found");
        return;
    }

    const path = window.location.pathname
        .replace(/\/$/, "")
        .split("/")
        .filter(Boolean);

    const baseUrl = "https://level.casino";

    const breadcrumbs = [
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
            .replace(/\b\w/g, c => c.toUpperCase());

        const customLabels = {
            casinos: "Casinos",
            reviews: "Reviews",
            news: "News",
            crypto: "Crypto",
            canada: "Canada",
            nigeria: "Nigeria",
            brazil: "Brazil",
            europe: "Europe",
            asia: "Asia",
            africa: "Africa",
            usa: "USA"
        };

        if (customLabels[segment.toLowerCase()]) {
            label = customLabels[segment.toLowerCase()];
        }

        breadcrumbs.push({
            name: label,
            url: baseUrl + currentPath + "/"
        });

    });

    // Visible Breadcrumbs

    container.innerHTML = `
        <nav class="breadcrumbs" aria-label="Breadcrumb">
            ${breadcrumbs.map((item, index) => {

                if (index === breadcrumbs.length - 1) {
                    return `<span>${item.name}</span>`;
                }

                return `<a href="${item.url}">${item.name}</a>`;

            }).join(" › ")}
        </nav>
    `;

    // Remove old schema if present

    const oldSchema = document.getElementById("breadcrumb-schema");

    if (oldSchema) {
        oldSchema.remove();
    }

    // JSON-LD Schema

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

    script.id = "breadcrumb-schema";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);

    document.head.appendChild(script);

    console.log("Breadcrumbs generated:", breadcrumbs);

});
