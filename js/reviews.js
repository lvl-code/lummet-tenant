document.addEventListener("DOMContentLoaded", async () => {
    // 1. Extract Casino ID from the URL path
    // Format: domain.com/review/stake -> "stake"
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    
    // Logic: Look for the segment immediately after "review"
    // If the URL is just /review/ or /review/index.html, it falls back to a default
    const reviewBaseIndex = pathSegments.indexOf('review');
    let casinoId = null;

    if (reviewBaseIndex !== -1 && pathSegments.length > reviewBaseIndex + 1) {
        casinoId = pathSegments[reviewBaseIndex + 1];
    }

    // Fallback if no ID is found in the path
    if (!casinoId || casinoId === "index.html") {
        casinoId = "bcgame"; // Change this to your preferred default
    }

    try {
        // 2. Fetch the JSON data
        const res = await fetch("/data/casinos.json");
        if (!res.ok) throw new Error("Failed to load JSON");
        const casinos = await res.json();

        // 3. Find the specific casino matching the URL segment to the JSON ID
        const casino = casinos.find(c => c.id.toLowerCase() === casinoId.toLowerCase());

        if (!casino) {
            document.querySelector(".content-container").innerHTML = `
                <div style="text-align:center; padding: 100px 0;">
                    <h2 style="font-family: 'Orbitron'; color: #fff;">Review Not Found</h2>
                    <p style="color: #ccc;">We couldn't find a review for "${casinoId}".</p>
                    <a href="/" style="color:var(--electric-purple); font-weight: bold; text-decoration: none;">← Return to Rankings</a>
                </div>`;
            document.getElementById("loading-overlay").style.display = "none";
            return;
        }

        // 4. Populate the DOM with the specific JSON info
        document.title = `${casino.name} Review 2026 | Level.casino`;
        
        // Update Header & Logo
        const logoImg = document.getElementById("dyn-logo");
        logoImg.src = casino.logo;
        logoImg.alt = `${casino.name} Logo`;
        
        document.getElementById("dyn-name").innerText = casino.name;
        document.getElementById("dyn-score").innerText = casino.score;
        document.getElementById("dyn-visit-hero").href = casino.link;
        
        // Update Text Content
        document.querySelectorAll("#dyn-name-text, #dyn-name-text2").forEach(el => {
            el.innerText = casino.name;
        });
        
        // Update Bonus Section
        document.getElementById("dyn-bonus-title").innerText = casino.bonus_title || "Exclusive Offer";
        document.getElementById("dyn-bonus-main").innerText = casino.bonus_desc || "Claim your rewards today.";
        document.getElementById("dyn-visit-bonus").href = casino.link;

        // Populate Features Grid
        const featuresContainer = document.getElementById("dyn-features");
        featuresContainer.innerHTML = "";
        
        if (casino.features && casino.features.length > 0) {
            casino.features.forEach(feature => {
                let icon = "⚡"; // Default
                const text = typeof feature === "string" ? feature : `${feature.title}: ${feature.value}`;
                
                // Smart icon selection based on text content
                const lowerText = text.toLowerCase();
                if (lowerText.includes("licens")) icon = "🛡️";
                if (lowerText.includes("pay") || lowerText.includes("crypto") || lowerText.includes("withdraw")) icon = "💳";
                if (lowerText.includes("support") || lowerText.includes("chat")) icon = "🎧";
                if (lowerText.includes("game") || lowerText.includes("slot")) icon = "🎰";

                featuresContainer.innerHTML += `
                    <div class="feature-item">
                        <span style="font-size: 1.5rem;">${icon}</span>
                        <span style="color: #ddd; font-size: 0.95rem;">${text}</span>
                    </div>
                `;
            });
        }

        // 5. Populate Sister Casinos (SEO Link Update)
        // Pick 3 random casinos that are NOT the current one
        const otherCasinos = casinos
            .filter(c => c.id !== casino.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);

        const sistersContainer = document.getElementById("dyn-sisters");
        if (sistersContainer) {
            sistersContainer.innerHTML = "";
            otherCasinos.forEach(sister => {
                sistersContainer.innerHTML += `
                    <div class="sister-card">
                        <div>
                            <img src="${sister.logo}" alt="${sister.name}" onerror="this.style.visibility='hidden'">
                            <h4 style="color: #fff; font-family: 'Orbitron'; font-size: 1.1rem; margin-bottom: 5px;">${sister.name}</h4>
                            <div class="status-badge" style="padding: 2px 10px; font-size: 0.75rem; margin-bottom: 15px; border: none; background: transparent; color: var(--electric-purple);">
                                SCORE: ${sister.score}
                            </div>
                        </div>
                        <a href="/review/${sister.id}" class="btn-outline" style="padding: 10px; font-size: 0.85rem; border-radius: 8px; text-decoration: none;">Read Review</a>
                    </div>
                `;
            });
        }

        // 6. Final UI Reveal
        setTimeout(() => {
            const loader = document.getElementById("loading-overlay");
            if (loader) {
                loader.style.opacity = "0";
                setTimeout(() => loader.style.display = "none", 300);
            }
        }, 200);

    } catch (error) {
        console.error("Critical Error:", error);
        const loader = document.getElementById("loading-overlay");
        if (loader) loader.innerText = "Error loading data. Please try again.";
    }
});
