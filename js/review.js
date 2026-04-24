document.addEventListener("DOMContentLoaded", async () => {
    // 1. Get the Casino ID from the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    let casinoId = urlParams.get('id');

    // Fallback for testing if no ID is provided in URL
    if (!casinoId) casinoId = "skolcasino"; 

    try {
        // 2. Fetch the JSON data
        const res = await fetch("/data/casinos.json");
        if (!res.ok) throw new Error("Failed to load JSON");
        const casinos = await res.json();

        // 3. Find the specific casino
        const casino = casinos.find(c => c.id === casinoId);

        if (!casino) {
            document.querySelector(".content-container").innerHTML = `
                <div style="text-align:center; padding: 100px 0;">
                    <h2>Casino Not Found</h2>
                    <p>We couldn't find data for this operator. <a href="/" style="color:var(--electric-purple);">Return to Home</a></p>
                </div>`;
            document.getElementById("loading-overlay").style.display = "none";
            return;
        }

        // 4. Populate the DOM with JSON data
        document.title = `${casino.name} Review 2026 | Level.casino`;
        
        // Header info
        document.getElementById("dyn-logo").src = casino.logo;
        document.getElementById("dyn-name").innerText = casino.name;
        document.getElementById("dyn-score").innerText = casino.score;
        document.getElementById("dyn-visit-hero").href = casino.link;
        
        // Body text customization
        document.getElementById("dyn-name-text").innerText = casino.name;
        document.getElementById("dyn-name-text2").innerText = casino.name;
        
        // Bonus Box
        document.getElementById("dyn-bonus-title").innerText = casino.bonus_title || "Exclusive Offer";
        document.getElementById("dyn-bonus-main").innerText = casino.bonus_desc || "Sign up today to claim your exclusive rewards.";
        document.getElementById("dyn-visit-bonus").href = casino.link;

        // Features Grid Mapping
        const featuresContainer = document.getElementById("dyn-features");
        featuresContainer.innerHTML = ""; // Clear fallback
        
        if (casino.features && casino.features.length > 0) {
            casino.features.forEach(feature => {
                // Determine icon based on text content for a cooler look
                let icon = "⚡";
                let text = typeof feature === "string" ? feature : `${feature.title}: ${feature.value}`;
                
                if(text.toLowerCase().includes("license") || text.toLowerCase().includes("mga") || text.toLowerCase().includes("ukgc")) icon = "🛡️";
                if(text.toLowerCase().includes("payment") || text.toLowerCase().includes("crypto")) icon = "💳";
                if(text.toLowerCase().includes("withdrawal") || text.toLowerCase().includes("speed")) icon = "⏱️";

                featuresContainer.innerHTML += `
                    <div class="feature-item">
                        <span style="font-size: 1.5rem;">${icon}</span>
                        <span style="color: #ddd; font-size: 0.95rem;">${text}</span>
                    </div>
                `;
            });
        } else {
            featuresContainer.innerHTML = `<p style="color:var(--text-gray);">Standard features apply.</p>`;
        }

        // 5. Populate "Sister/Other Casinos" dynamically
        // We filter out the current casino, shuffle the array, and pick the first 3
        const otherCasinos = casinos.filter(c => c.id !== casinoId).sort(() => 0.5 - Math.random()).slice(0, 3);
        const sistersContainer = document.getElementById("dyn-sisters");
        sistersContainer.innerHTML = "";

        otherCasinos.forEach(sister => {
            sistersContainer.innerHTML += `
                <div class="sister-card">
                    <div>
                        <img src="${sister.logo}" alt="${sister.name} Logo" onerror="this.style.display='none'">
                        <h4 style="color: #fff; font-family: 'Orbitron'; font-size: 1.1rem; margin-bottom: 5px;">${sister.name}</h4>
                        <div class="status-badge" style="padding: 2px 10px; font-size: 0.75rem; margin-bottom: 15px; border: none; background: transparent; color: var(--electric-purple);">
                            SCORE: ${sister.score}
                        </div>
                    </div>
                    <a href="/review.html?id=${sister.id}" class="btn-outline" style="padding: 10px; font-size: 0.85rem; border-radius: 8px;">Read Review</a>
                </div>
            `;
        });

        // 6. Hide loading overlay
        setTimeout(() => {
            document.getElementById("loading-overlay").style.opacity = "0";
            setTimeout(() => {
                document.getElementById("loading-overlay").style.display = "none";
            }, 300);
        }, 200); // Tiny delay ensures fonts and images start painting

    } catch (error) {
        console.error("Error fetching casino data:", error);
        document.getElementById("loading-overlay").innerText = "Error loading data.";
    }
});
