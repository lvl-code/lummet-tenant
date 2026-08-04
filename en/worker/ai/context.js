async searchCasino(env, q) {

    const data = await env.DB.prepare(`
        SELECT
            name,
            slug,
            rating,
            supported_countries,
            restricted_countries
        FROM casinos
        WHERE name LIKE ?
        LIMIT 5
    `)
    .bind(`%${q}%`)
    .all();

    return {
        casinos: data.results
    };
}

async searchReview(env, q) {

    const data = await env.DB.prepare(`
        SELECT
            title,
            slug,
            rating
        FROM reviews
        WHERE title LIKE ?
        LIMIT 5
    `)
    .bind(`%${q}%`)
    .all();

    return {
        reviews: data.results
    };
}

async getGeo(env, country) {

    const data = await env.DB.prepare(`
        SELECT *
        FROM geo_rules
        WHERE country_code = ?
    `)
    .bind(country)
    .all();

    return {
        geo: data.results
    };
}
