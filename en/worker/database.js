export const dbLayer = {
  /**
   * Safe JSON parser for D1 TEXT fields
   */
  parseJsonField(fieldData, fallback = []) {
    if (!fieldData) return fallback;
    try {
      return typeof fieldData === 'string' ? JSON.parse(fieldData) : fieldData;
    } catch (e) {
      console.error("JSON Parse Error in DB Field:", e);
      return fallback;
    }
  },

  /**
   * Retrieves a core casino asset along with its localized geo rules mapping
   */
  async getCasinoContext(db, slug, countryCode) {
    if (!db) throw new Error("D1 Binding Missing");

    // Parallel query processing maximizes database execution speeds at the edge
    const casinoQuery = db.prepare(`SELECT * FROM casinos WHERE slug = ?`).bind(slug).first();
    const geoQuery = db.prepare(`SELECT * FROM geo_rules WHERE casino_slug = ? AND country = ?`).bind(slug, countryCode).first();
    const reviewQuery = db.prepare(`SELECT * FROM reviews WHERE casino_slug = ? AND country = ?`).bind(slug, countryCode).first();

    const [casino, geoRule, localizedReview] = await Promise.all([casinoQuery, geoQuery, reviewQuery]);

    if (!casino) return null;

    // Normalize structural data strings into standard JSON structures
    casino.features = this.parseJsonField(casino.features);
    casino.supported_countries = this.parseJsonField(casino.supported_countries);
    casino.restricted_countries = this.parseJsonField(casino.restricted_countries);

    if (localizedReview) {
      localizedReview.pros = this.parseJsonField(localizedReview.pros);
      localizedReview.cons = this.parseJsonField(localizedReview.cons);
    }

    return {
      casino,
      geoRule: geoRule || { status: 'allowed', bonus_override: null },
      review: localizedReview || null
    };
  },

  /**
   * Fetches data allocations for custom dynamic pages
   */
  async getPageData(db, cleanSlug) {
    if (!db) return null;
    const page = await db.prepare(`SELECT * FROM pages WHERE slug = ?`).bind(cleanSlug).first();
    if (!page) return null;

    page.content_json = this.parseJsonField(page.content_json, {});
    return page;
  },

  /**
   * Pulls the absolute top-ranked operators configured for a given jurisdiction
   */
  async getCountryDirectory(db, countryCode) {
    if (!db) return null;
    const countryData = await db.prepare(`SELECT * FROM countries WHERE code = ?`).bind(countryCode).first();
    if (!countryData) return null;

    countryData.recommended_casinos = this.parseJsonField(countryData.recommended_casinos);
    return countryData;
  }
};
