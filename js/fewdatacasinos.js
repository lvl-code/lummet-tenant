async function loadCasinos() {
    const container = document.getElementById("casino-list");
    const loadingState = document.getElementById("loading-state");
    
    // Table Elements
    const tableBody = document.getElementById("dynamic-comparison-table");
    const tableLoading = document.getElementById("table-loading-state");

    try {
        const res = await fetch("/data/casinos.json");
        if (!res.ok) throw new Error("Failed to load casino data");
        const casinos = await res.json();

        // GEO DATA FROM WORKER (Fallback to crypto/US if worker bypasses)
        const category = window.USER_CATEGORY || "crypto";
        const country = (window.GEO && window.GEO.country) ? window.GEO.country : (window.USER_COUNTRY || "US");

        // FILTER LOGIC — 3-layer control:
        // 1. Category match (global category like crypto, bonus, etc.)
        // 2. Country restriction (hard block list)
        // 3. Override (bypasses both category gate AND restriction)
        const filtered = casinos.filter(casino => {
            const categoryMatch = !casino.category || casino.category.includes(category);
            const hasOverride = casino.allow_override && casino.allow_override.includes(country);
            const isRestricted = casino.restricted && casino.restricted.includes(country) && !hasOverride;
            return (categoryMatch || hasOverride) && !isRestricted;
        });

        // SORT — highest score first
        const sorted = [...filtered].sort((a, b) => {
            const scoreA = parseFloat(a.score) || 0;
            const scoreB = parseFloat(b.score) || 0;
            return scoreB - scoreA;
        });

        // Hide loading states once data is processed
        if (loadingState) loadingState.style.display = "none";
        if (tableLoading) tableLoading.style.display = "none";

        if (sorted.length === 0) {
            if (container) container.innerHTML = `<p style="color:var(--text-gray); text-align:center;">No casinos available for your region in this category.</p>`;
            if (tableBody) tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-level-gray">No data available for your region.</td></tr>`;
            return;
        }

        // ==========================================
        // 1. RENDER CASINO CARDS
        // ==========================================
        if (container) {
            container.innerHTML = "";
            sorted.forEach((casino, index) => {
                const card = document.createElement("div");
                
                card.innerHTML = `
                <article class="glass-panel rounded-xl p-1 flex flex-col md:flex-row hover:border-level-purple transition-colors duration-300 group mb-4">
                    <div class="bg-level-dark rounded-l-lg w-full md:w-16 flex flex-row md:flex-col items-center justify-center py-3 px-4 md:px-0 border-b md:border-b-0 md:border-r border-level-border gap-2">
                        <button class="vote-btn text-level-gray text-xl">▲</button>
                        <span class="text-sm font-bold text-level-purple">${casino.score.replace('/5', '')}</span>
                    </div>
                    <div class="p-4 md:p-5 w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div class="w-full">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="bg-level-purple/10 text-level-purple border border-level-purple/20 text-[10px] uppercase tracking-widest font-bold py-0.5 px-2 rounded-full">
                                    ${casino.tag || "Top Rated"}
                                </span>
                                <span class="text-xs text-level-gray font-semibold">Rank #${index + 1}</span>
                            </div>
                            <h3 class="text-xl font-orbitron font-bold text-white mb-2 flex items-center gap-3">
                                ${casino.logo ? `<img src="${casino.logo}" alt="${casino.name}" style="height:24px; border-radius:4px;">` : ''} 
                                ${casino.name}
                            </h3>
                            <p class="text-sm text-level-gray mb-3">${casino.bonus_desc || "Top-rated casino available in your region."}</p>
                        </div>
                        <div class="shrink-0 w-full md:w-auto flex flex-col gap-2">
                            <a href="${casino.link}" class="block w-full bg-level-purple hover:bg-level-pink text-white font-bold py-2.5 px-6 rounded-lg text-sm text-center transition-all shadow-[0_0_15px_rgba(157,80,187,0.2)]">
                                Claim Bonus
                            </a>
                            <a href="${casino.review}" class="block w-full bg-transparent border border-level-purple hover:bg-level-purple/10 text-white font-bold py-2 px-6 rounded-lg text-xs text-center transition-all">
                                Read Review
                            </a>
                        </div>
                    </div>
                </article>
                `;
                container.appendChild(card);
            });
        }

        // ==========================================
        // 2. RENDER DYNAMIC COMPARISON TABLE
        // ==========================================
        if (tableBody) {
            tableBody.innerHTML = "";
            // Take top 5 for the table
            const topCasinos = sorted.slice(0, 5);

            topCasinos.forEach(casino => {
                // Smart fallback data logic (so you don't have to alter your JSON right away)
                const isCrypto = casino.category && casino.category.includes("crypto");
                const isFast = casino.category && (casino.category.includes("africa_fast") || isCrypto);
                
                // If you add "payout_speed" to JSON it uses it, otherwise it guesses based on categories
                const speed = casino.payout_speed || (isFast ? "Instant / < 10 Mins" : "1-3 Business Days");
                const cryptoSupport = casino.crypto_support || (isCrypto ? "Extensive (50+)" : "Fiat & Bitcoin");
                const topFeature = casino.bonus_title || "Provably Fair";

                const tr = document.createElement("tr");
                tr.className = "border-b border-level-border hover:bg-level-dark/50 transition-colors cursor-pointer";
                tr.onclick = () => window.location.href = casino.review || casino.link;
                
                tr.innerHTML = `
                    <td class="px-4 py-3 font-bold text-white flex items-center gap-2">
                        ${casino.logo ? `<img src="${casino.logo}" alt="${casino.name}" class="w-5 h-5 rounded-full object-cover">` : ''}
                        ${casino.name}
                    </td>
                    <td class="px-4 py-3 ${isFast ? 'text-green-400 font-semibold' : 'text-yellow-400'}">${speed}</td>
                    <td class="px-4 py-3 text-white/80">${cryptoSupport}</td>
                    <td class="px-4 py-3 text-level-pink font-semibold">${topFeature}</td>
                `;
                tableBody.appendChild(tr);
            });
        }

        // DYNAMIC HEADING (Optional, keeps your original logic)
        const title = document.querySelector("#dynamic-casino-title");
        if (title) {
            if (category === "crypto") {
                title.innerHTML = 'Top Rated <span class="text-gradient">Crypto Casinos</span>';
            } else if (category === "trusted_mga") {
                title.innerHTML = 'Top Rated <span class="text-gradient">Trusted Casinos</span>';
            } else if (category === "africa_fast" || category === "fast-payout") {
                title.innerHTML = 'Top Rated <span class="text-gradient">Fast Payout Casinos</span>';
            }
        }

    } catch (err) {
        console.error("Error loading casinos:", err);
        if (loadingState) loadingState.innerHTML = "Failed to load casino rankings. Please refresh the page.";
        if (tableLoading) tableLoading.innerHTML = "Failed to load table data.";
    }
}

document.addEventListener("DOMContentLoaded", loadCasinos);
