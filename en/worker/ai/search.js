import * as casinosDB from "../database/casinos.js";
import * as reviewsDB from "../database/reviews.js";
import * as newsDB from "../database/news.js";
import * as pagesDB from "../database/pages.js";
import {searchFAQs}
from "../database/faqs.js";

export const aiSearch = {


async search(env, query, country="RW") {


const q = `%${query.toLowerCase()}%`;


// Casinos
const casinos = await env.DB.prepare(`
SELECT
slug,
name,
rating,
bonus_title,
bonus_value,
website_url
FROM casinos
WHERE
published = 1
AND (
LOWER(name) LIKE ?
OR LOWER(bonus_title) LIKE ?
)
LIMIT 10
`)
.bind(q,q)
.all();



// Reviews
const reviews = await env.DB.prepare(`
SELECT
title,
casino_slug,
overview
FROM reviews
WHERE
published = 1
AND (
LOWER(title) LIKE ?
OR LOWER(overview) LIKE ?
)
LIMIT 5
`)
.bind(q,q)
.all();



// News
const news = await env.DB.prepare(`
SELECT
title,
slug,
excerpt
FROM news
WHERE
published = 1
AND (
LOWER(title) LIKE ?
OR LOWER(excerpt) LIKE ?
)
LIMIT 5
`)
.bind(q,q)
.all();



// Pages
const pages = await env.DB.prepare(`
SELECT
title,
slug,
content
FROM pages
WHERE
published = 1
AND (
LOWER(title) LIKE ?
OR LOWER(content) LIKE ?
)
LIMIT 5
`)
.bind(q,q)
.all();

const faqs =
await searchFAQs(
env.DB,
query.toLowerCase()
);

return {

country,

casinos: casinos.results || [],

reviews: reviews.results || [],

news: news.results || [],

pages: pages.results || [],

faqs

};


}


};
