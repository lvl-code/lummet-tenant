async function loadCasinos() {
    const container = document.getElementById("casino-list");
    const loadingState = document.getElementById("loading-state");

    try {
        const res = await fetch("/data/casinos.json");
        if (!res.ok) throw new Error("Failed to load casino data");
        const casinos = await res.json();

        // GEO DATA FROM WORKER (Fallback to crypto/US if worker bypasses)
        const category = window.USER_CATEGORY || "crypto";
        const country = window.USER_COUNTRY || "US";

        // FILTER LOGIC
        const filtered = casinos.filter(casino => {
            const categoryMatch = !casino.category || casino.category.includes(category);
            const isRestricted = casino.restricted && casino.restricted.includes(country);
            return categoryMatch && !isRestricted;
        });

        // Hide loading state once data is processed
        if (loadingState) loadingState.style.display = "none";

        // EMPTY STATE (COMPLIANCE SAFE)
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="acquisition-card" style="margin: 0 auto; border-style: solid; border-color: var(--electric-purple); padding: 40px 25px; text-align: center;">
                    <h3 style="font-family: 'Orbitron'; color: #fff;">No Available Casinos</h3>
                    <p style="color: var(--text-gray);">Due to regional restrictions, no offers are currently available in your location.</p>
                </div>
            `;
            return;
        }

        // RENDER CARDS (Centered and Professionally Aligned)
        filtered.forEach((casino, index) => {
            const card = document.createElement("div");
            card.className = "acquisition-card";
            
            // Inline overrides for perfect vertical stacking and centering
            card.style.margin = "0 auto 40px auto"; 
            card.style.maxWidth = "700px";
            card.style.borderStyle = "solid";
            card.style.borderColor = "var(--electric-purple)";
            card.style.padding = "0";
            card.style.overflow = "hidden";
            card.style.display = "flex";
            card.style.flexDirection = "column";

            const featuresHTML = casino.features.map(f => {
                if (typeof f === "string") {
                    return `
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="color:var(--electric-purple); font-size:1.1rem;">✔</span> ${f}
                        </div>
                    `;
                } else {
                    return `
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="color:var(--electric-purple); font-size:1.1rem;">✔</span> 
                            <strong>${f.title}</strong> ${f.value}
                        </div>
                    `;
                }
            }).join("");

            card.innerHTML = `
                <div style="width:100%; height:180px; background:#1a1a1f; display:flex; align-items:center; justify-content:center; border-bottom:1px solid var(--electric-purple);">
                    <img src="${casino.logo}" alt="${casino.name}" 
                        style="width:100%; height:100%; object-fit:cover;"
                        onerror="this.src='${casino.fallback_logo || ''}'">
                </div>

                <div style="padding: 30px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap: wrap; gap: 10px;">
                        <h3 style="font-family:'Orbitron'; margin:0; font-size:1.6rem; color:#fff; display:flex; align-items:center; gap: 10px;">
                            <span style="color: var(--text-gray); font-size: 1.2rem;">#${index + 1}</span> ${casino.name}
                        </h3>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <span style="color:var(--text-gray); font-size:0.85rem; text-transform: uppercase; letter-spacing: 1px;">
                                ${casino.tag || ""}
                            </span>
                            <span class="status-badge" style="margin:0; padding: 4px 12px; font-size: 0.8rem;">
                                <div class="pulse-dot"></div> LVL SCORE: ${casino.score}
                            </span>
                        </div>
                    </div>

                    <div style="background:rgba(157,80,187,0.1); border-left:3px solid var(--neon-pink); padding:18px; margin-bottom:20px; border-radius:8px;">
                        <p style="margin:0; font-size:1.15rem; color:#fff;">
                            <strong style="color: var(--electric-purple);">${casino.bonus_title || "BONUS:"}</strong> ${casino.bonus_main || ""}
                        </p>
                        <p style="margin:5px 0 0; font-size:0.9rem; color:var(--text-gray); line-height: 1.5;">
                            ${casino.bonus_desc || ""}
                        </p>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:25px; font-size:0.9rem; color:#bbb;">
                        ${featuresHTML}
                    </div>

                    <div style="border-top:1px solid #2a2a35; padding-top:20px; margin-bottom:25px;">
                        <p style="font-size:0.8rem; color:#666; line-height:1.5;">
                            <strong style="color:#888;">Region Responsibility:</strong> 
                            Online gambling laws vary by jurisdiction. It is your sole responsibility to ensure that you comply with local laws before registering.
                            <br><br>
                            <span style="color:#999; font-weight:800;">
                                18+ | PLAY RESPONSIBLY | 
                                <a href="/terms-and-conditions.html" style="color:var(--text-gray); text-decoration: underline;">
                                    T&Cs APPLY
                                </a>
                            </span>
                        </p>
                    </div>

                    <div style="display:flex; gap:15px; flex-wrap: wrap;">
                        <a href="${casino.link}" class="btn-main btn-purple" style="flex:1; min-width: 200px; text-align:center; font-size:0.95rem; padding:15px;">
                            Visit Casino
                        </a>
                        <a href="${casino.review}" class="btn-outline" style="flex:1; min-width: 150px; text-align:center; font-size:0.95rem; padding:15px;">
                            Full Review
                        </a>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });

        // DYNAMIC HEADING
        const title = document.querySelector("#dynamic-casino-title");
        if (title) {
            if (category === "crypto") {
                title.innerHTML = 'Top <span class="hero-highlight">Crypto Casinos</span> 2026';
            } else if (category === "trusted_mga") {
                title.innerHTML = 'Top <span class="hero-highlight">Trusted Casinos</span> 2026';
            } else if (category === "bonus") {
                title.innerHTML = 'Top <span class="hero-highlight">Bonus Casinos</span> 2026';
            } else if (category === "africa_fast") {
                title.innerHTML = 'Top <span class="hero-highlight">Fast Payout Casinos</span> 2026';
            }
        }

    } catch (err) {
        console.error("Error loading casinos:", err);
        if (loadingState) {
            loadingState.innerHTML = "Failed to load casino rankings. Please refresh the page.";
        }
    }
}

document.addEventListener("DOMContentLoaded", loadCasinos);
