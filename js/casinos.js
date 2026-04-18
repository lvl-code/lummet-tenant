async function loadCasinos() {
    const container = document.getElementById("casino-list");

    try {
        const res = await fetch("/data/casinos.json");
        const casinos = await res.json();

        casinos.forEach(casino => {
            const card = document.createElement("div");
            card.className = "acquisition-card";
            card.style.borderStyle = "solid";
            card.style.borderColor = "var(--electric-purple)";
            card.style.padding = "0";
            card.style.overflow = "hidden";
            card.style.display = "flex";
            card.style.flexDirection = "column";

            card.innerHTML = `
                <div style="width:100%; height:100%; background:#1a1a1f; display:flex; align-items:center; justify-content:center; border-bottom:1px solid var(--electric-purple);">
                    <img src="${casino.logo}" alt="${casino.name}" 
                        style="width:100%; height:100%; object-fit:cover;">
                </div>

                <div style="padding:25px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h3 style="font-family:'Orbitron'; margin:0; font-size:1.6rem; color:#fff;">
                            ${casino.name}
                        </h3>
                        <span style="color:var(--text-gray); font-size:0.75rem;">
                            ${casino.tag}
                        </span>
                        <span class="status-badge">
                            <div class="pulse-dot"></div> LVL SCORE: ${casino.score}
                        </span>
                    </div>

                    <div style="background:rgba(157,80,187,0.1); border-left:3px solid var(--neon-pink); padding:15px; margin-bottom:20px; border-radius:8px;">
                        <p style="margin:0; font-size:1.1rem; color:#fff;">
                            <strong>BONUS:</strong> ${casino.bonus_title}
                        </p>
                        <p style="margin:5px 0 0; font-size:0.85rem; color:var(--text-gray);">
                            ${casino.bonus_desc}
                        </p>
                    </div>

                    <div style="display:flex; flex-wrap:wrap; gap:15px; margin-bottom:20px; font-size:0.85rem; color:#bbb;">
                        ${casino.features.map(f => `
                            <div style="display:flex; align-items:center; gap:5px;">
                                <span style="color:var(--electric-purple);">✔</span> ${f}
                            </div>
                        `).join("")}
                    </div>

                    <div style="border-top:1px solid #222; padding-top:15px; margin-bottom:20px;">
                        <p style="font-size:0.75rem; color:#666;">
                            18+ | PLAY RESPONSIBLY | T&Cs APPLY
                        </p>
                    </div>

                    <div style="display:flex; gap:10px;">
                        <a href="${casino.link}" class="btn-main btn-purple" style="flex:2; text-align:center;">
                            Visit Casino
                        </a>
                        <a href="${casino.review}" class="btn-outline" style="flex:1; text-align:center;">
                            Review
                        </a>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });

    } catch (err) {
        console.error("Error loading casinos:", err);
    }
}

document.addEventListener("DOMContentLoaded", loadCasinos);
