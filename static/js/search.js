// =====================================================
// LIVE SEARCH
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const results = document.getElementById("searchResults");
  if (!input || !results) return;

  let debounceTimer;

  input.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();

    if (query.length < 2) {
      results.classList.remove("active");
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch("/api/v1/casinos/list");
        const data = await res.json();

        const matches = (data.casinos || []).filter((c) =>
          c.name.toLowerCase().includes(query.toLowerCase())
        );

        if (matches.length === 0) {
          results.innerHTML = '<div class="search-result-item muted">No results</div>';
        } else {
          results.innerHTML = matches
            .slice(0, 8)
            .map(
              (c) => `
            <a href="/en/casino/${c.slug}" class="search-result-item">
              <img src="${c.logo || "/en/static/images/logo.png"}" alt="${c.name}" onerror="this.src='/en/static/images/logo.png'">
              <div>
                <strong>${c.name}</strong>
                <span class="muted">★ ${c.rating || "N/A"}</span>
              </div>
            </a>
          `
            )
            .join("");
        }

        results.classList.add("active");
      } catch {
        results.innerHTML = '<div class="search-result-item muted">Search error</div>';
        results.classList.add("active");
      }
    }, 300);
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      results.classList.remove("active");
    }
  });
});
