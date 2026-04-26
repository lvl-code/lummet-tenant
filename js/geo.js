function countryToFlag(countryCode) {
    if (!countryCode) return "🌍";
    return countryCode
        .toUpperCase()
        .replace(/./g, char =>
            String.fromCodePoint(127397 + char.charCodeAt())
        );
}

async function loadGeoWidget() {
    try {
        const res = await fetch("/geo");
        const data = await res.json();

        const el = document.getElementById("geo-widget");
        if (!el) return;

        const flag = countryToFlag(data.country);
        const city = data.city || "Unknown";
        const country = data.country || "??";
        const timezone = data.timezone;

        // formatted local time (real accurate)
        const now = new Date();
        const localTime = new Intl.DateTimeFormat("en-GB", {
            timeZone: timezone,
            dateStyle: "medium",
            timeStyle: "short"
        }).format(now);

        el.innerHTML = `
            <span class="geo-flag">${flag}</span>
            <span>${country} (${city})</span>
            <span class="geo-time" style="margin-left: 10px;">🕐 ${localTime}</span>
        `;

        // optional global use for casino logic
        window.GEO = data;

    } catch (err) {
        document.getElementById("geo-widget").innerText = "🌍 Location unavailable";
    }
}

document.addEventListener("DOMContentLoaded", loadGeoWidget);
