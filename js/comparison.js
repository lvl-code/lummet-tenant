/**
 * comparison.js
 * Synchronized with card logic to show top 5 available casinos.
 */

async function initComparisonTable() {
    const tableBody = document.getElementById("dynamic-comparison-table");
    const statusBox = document.getElementById("table-status");

    if (!tableBody) return;

    try {
        const response = await fetch("/data/casinos.json");
        if (!response.ok) throw new Error("Data fetch failed");
        const casinos = await response.json();

        // 1. GEO & CATEGORY LOGIC (Mirrors casinos.js)
        const userCategory = window.USER_CATEGORY || "crypto";
        const userCountry = (window.GEO && window.GEO.country) ? window.GEO.country : (window.USER_COUNTRY || "US");

        // 2. FILTER & SORT
        const filteredCasinos = casinos.filter(casino => {
            const isCategoryMatch = !casino.category || casino.category.includes(userCategory);
            const isOverridden = casino.allow_override && casino.allow_override.includes(userCountry);
            const isBlocked = casino.restricted && casino.restricted.includes(userCountry) && !isOverridden;
            return (isCategoryMatch || isOverridden) && !isBlocked;
        });

        const sortedCasinos = [...filteredCasinos].sort((a, b) => {
            return parseFloat(b.score) - parseFloat(a.score);
        });

        // 3. CLEANUP UI
        if (statusBox) statusBox.style.display = "none";
        tableBody.innerHTML = "";

        if (sortedCasinos.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-level-gray">No comparable casinos found for your region.</td></tr>`;
            return;
        }

        // 4. RENDER TOP 5
        const topFive = sortedCasinos.slice(0, 5);

        topFive.forEach(casino => {
            // Data Extraction Helpers
            const featuresStr = casino.features ? casino.features.join(' ').toLowerCase() : '';
            const isCryptoCat = casino.category && casino.category.includes('crypto');
            
            // Auto-detect Payout Speed from features
            let payout = "1-3 Days";
            if (featuresStr.includes('instant') || featuresStr.includes('fast')) payout = "Instant - 10m";
            else if (featuresStr.includes('24h') || featuresStr.includes('same day')) payout = "< 24 Hours";

            // Auto-detect Payment Support
            let payments = "Fiat & Crypto";
            if (isCryptoCat || featuresStr.includes('crypto-only')) payments = "Pure Crypto";
            if (featuresStr.includes('fiat') && featuresStr.includes('crypto')) payments = "Hybrid (All)";

            const row = document.createElement("tr");
            row.className = "hover:bg-level-purple/5 transition-colors group border-b border-level-border/10";
            
            row.innerHTML = `
                <td class="px-6 py-5">
                    <div class="flex items-center gap-3">
                        ${casino.logo ? `<img src="${casino.logo}" alt="${casino.name}" class="w-8 h-8 rounded-lg object-contain bg-white/5 p-1">` : ''}
                        <div>
                            <div class="text-white font-bold font-orbitron text-sm">${casino.name}</div>
                            <div class="text-[10px] text-level-purple font-bold uppercase tracking-tighter">${casino.score} Rated</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-5 text-green-400 font-medium">${payout}</td>
                <td class="px-6 py-5 text-level-gray">${payments}</td>
                <td class="px-6 py-5">
                    <span class="text-white text-xs font-semibold">${casino.bonus_title || 'Welcome Pack'}</span>
                    <p class="text-[10px] text-level-gray truncate w-32">${casino.bonus_desc || ''}</p>
                </td>
                <td class="px-6 py-5 text-right">
                    <a href="${casino.link}" class="inline-block bg-level-purple hover:bg-level-pink text-white text-[10px] font-bold px-4 py-2 rounded-md transition-all uppercase tracking-widest">
                        Play
                    </a>
                </td>
            `;
            
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Comparison Table Error:", error);
        if (statusBox) statusBox.innerHTML = `<p class="text-red-500 text-xs">Failed to sync table data.</p>`;
    }
}

document.addEventListener("DOMContentLoaded", initComparisonTable);
