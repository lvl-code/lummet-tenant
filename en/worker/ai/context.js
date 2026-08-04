export const aiContext = {

    async get(env, intent, message, country) {

        switch (intent) {

            case "search":
                return await this.searchCasino(env, message);

            case "review":
                return await this.searchReview(env, message);

            case "news":
                return await this.getNews(env);

            case "geo":
                return await this.getGeo(env, country);

            default:
                return {};
        }
    },

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
    },

    async searchReview(env,q){

q = cleanQuery(q);

const data = await env.DB.prepare(`
SELECT
title,
slug,
rating
FROM reviews
WHERE title LIKE ?
OR casino_slug LIKE ?
LIMIT 5
`)
.bind(
`%${q}%`,
`%${q}%`
)
.all();


return {
reviews:data.results
};

}
    async getNews(env) {

        const data = await env.DB.prepare(`
            SELECT
                title,
                slug
            FROM news
            ORDER BY created_at DESC
            LIMIT 5
        `).all();

        return {
            news: data.results
        };
    },

async getGeo(env,country){

const data = await env.DB.prepare(`
SELECT
c.name,
c.slug,
g.status,
g.country_code
FROM geo_rules g
JOIN casinos c
ON c.slug = g.casino_slug
WHERE g.country_code = ?
AND g.status = 'allowed'
LIMIT 10
`)
.bind(country)
.all();


return {
available_casinos:data.results
};

}
    async getGeobackup(env, country) {

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

};

function cleanQuery(q){

return q
.toLowerCase()
.replace(
/(find|show|me|get|review|reviews|casino|about)/g,
""
)
.trim();

}
