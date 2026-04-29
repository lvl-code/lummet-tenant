/**
 * comparison.js
 * Handles the dynamic rendering of the Geo-Filtered Comparison Table.
 */

async function loadComparisonTable() {
    const tableBody = document.getElementById("dynamic-comparison-table");
    const tableLoading = document.getElementById("table-loading-state");

    // Exit if the table isn't on the current page
    if (!tableBody) return;

    try {
        const res = await fetch("/data/casinos.json");
        if (!res.ok) throw new Error("Failed to load casino data");
        const casinos = await res.json();

        // 1. GEO DATA SETUP
        const category = window.USER_CATEGORY || "crypto";
        const country = (window.GEO && window.GEO.country) ? window.GEO.country : (window.USER_COUNTRY || "US");

        // 2. FILTER LOGIC
        const filtered = casinos.filter(casino => {
            const categoryMatch = !casino.category || casino.category.includes(category);
            const hasOverride = casino.allow_override && casino.allow_override.includes(country);
            const isRestricted = casino.restricted && casino.restricted.includes(country) && !hasOverride;
            return (categoryMatch || hasOverride) && !isRestricted;
        });

        // 3. SORT LOGIC (Highest score first)
        const sorted = [...filtered].sort((a, b) => {
            const scoreA = parseFloat(a.score) || 0;
            const scoreB = parseFloat(b.score) || 0;
            return scoreB - scoreA;
        });

        // Hide loading state
        if (tableLoading) tableLoading.style.display = "none";

        // Handle Empty State
        if (sorted.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-4 py-6 text-center text-level-gray">
                        No comparison data available for your region.
                    </td>
                </tr>
            `;
            return;
        }

        // 4. RENDER TOP 5 CASINOS
        const topCasinos = sorted.slice(0, 5);
        tableBody.innerHTML = ""; // Clear any static placeholders

        topCasinos.forEach(casino => {
            // Smart Fallbacks: If your JSON doesn't have "payout_speed", it guesses based on categories
            const isCrypto = casino.category && casino.category.includes("crypto");
            const isFast = casino.category && (casino.category.includes("africa_fast") || isCrypto);
            
            const speed = casino.payout_speed || (isFast ? "Instant / < 10 Mins" : "1-3 Business Days");
            const cryptoSupport = casino.crypto_support || (isCrypto ? "Extensive (50+ Coins)" : "Fiat & Bitcoin");
            const topFeature = casino.bonus_title || "Provably Fair";

            // Create Row
            const tr = document.createElement("tr");
            tr.className = "border-b border-level-border hover:bg-level-dark/80 transition-colors cursor-pointer group";
            tr.onclick = () => window.location.href = casino.review || casino.link;
            
            tr.innerHTML = `
                <td class="px-4 py-4 font-bold text-white flex items-center gap-3">
                    ${casino.logo ? `<img src="${casino.logo}" alt="${casino.name}" class="w-6 h-6 rounded-full object-cover border border-level-border group-hover:border-level-purple transition-colors">` : ''}
                    <span class="group-hover:text-level-purple transition-colors">${casino.name}</span>
                </td>
                <td class="px-4 py-4 ${isFast ? 'text-green-400 font-semibold' : 'text-yellow-400'}">${speed}</td>
                <td class="px-4 py-4 text-white/80">${cryptoSupport}</td>
                <td class="px-4 py-4 text-level-pink font-semibold">${topFeature}</td>
            `;
            
            tableBody.appendChild(tr);
        });

    } catch (err) {
        console.error("Error loading comparison table:", err);
        if (tableLoading) {
            tableLoading.innerHTML = "Failed to load table data. Please refresh.";
        }
    }
}

// Ensure the function runs after DOM content is fully loaded
document.addEventListener("DOMContentLoaded", loadComparisonTable);
