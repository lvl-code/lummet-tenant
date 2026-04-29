import os

# 1. Define Target Markets (Avoid restricted zones like US, UK, NL)
locations = [
    {"name": "Rwanda", "code": "RW"},
    {"name": "Nigeria", "code": "NG"},
    {"name": "Kenya", "code": "KE"},
    {"name": "Canada", "code": "CA"},
    {"name": "India", "code": "IN"},
    {"name": "Brazil", "code": "BR"},
    {"name": "South Africa", "code": "ZA"},
    {"name": "New Zealand", "code": "NZ"},
    {"name": "Japan", "code": "JP"},
    {"name": "Germany", "code": "DE"} # Note: Diamond7 restricts DE, but others might not
]

# 2. Define Categories (Must match the exact strings in your casinos.json categories array)
categories = [
    {"title": "Crypto Casinos", "slug": "crypto", "intro": "Looking to wager with BTC, ETH, or USDT? Here are the highest-rated platforms supporting instant cryptocurrency transactions."},
    {"title": "Trusted MGA Casinos", "slug": "trusted_mga", "intro": "Play with peace of mind. These platforms hold active licenses from the Malta Gaming Authority, ensuring fair play and secure funds."},
    {"title": "High Bonus Casinos", "slug": "bonus", "intro": "Maximize your initial deposit. We've ranked the operators offering the most aggressive welcome packages and realistic wagering requirements."},
    {"title": "Fast Payout Casinos", "slug": "africa_fast", "intro": "Don't wait for your winnings. These operators prioritize rapid withdrawals via localized payment methods and crypto."}
]

# 3. Build the Directory
os.makedirs("_seo_pages", exist_ok=True)

# 4. Generate the Files
count = 0
for loc in locations:
    for cat in categories:
        filename = f"_seo_pages/{loc['name'].lower().replace(' ', '-')}-{cat['slug']}.md"
        
        frontmatter = f"""---
layout: seo_page
location_name: {loc['name']}
country_code: {loc['code']}
category_title: {cat['title']}
category_slug: {cat['slug']}
intro_text: "{cat['intro']}"
---
"""
        with open(filename, "w", encoding="utf-8") as f:
            f.write(frontmatter)
            count += 1

print(f"Success! Generated {count} SEO pages.")
