// =====================================================
// LUMMET AI — Understanding Pass (LLM-powered intent analysis)
// The AI "thinks" about what the user wants before searching
// =====================================================

import { detectIntent, extractEntities } from './router.js';

const MODEL = '@cf/zai-org/glm-4.7-flash';

const SCHEMA_DESCRIPTION = `Database tables and columns:
- casinos: name, slug, rating, bonus_title, bonus_value, license, owner, features, supported_countries, restricted_countries, featured
- reviews: title, slug, casino_slug, country_code, rating, overview, pros, cons, verdict, author, author_title, games, bonuses, payments, licenses, faq_json
- review_blocks: review_slug, title, content, position
- news: title, slug, excerpt, tags, author, published_at
- pages: title, slug, type
- faqs: question, answer, slug
- authors: name, slug, bio, role
- countries: code, name, currency, language, legal_status
- categories: name, slug, description
- geo_rules: casino_slug, country_code, status, bonus_override`;

const SYSTEM_PROMPT = `You are a search query analyzer for Level.casino, an independent online casino comparison platform.

Analyze the user's message and determine what information they need from the database. Consider the conversation history to resolve references like "it", "that one", "the first one", "compare it with...".

${SCHEMA_DESCRIPTION}

Respond with ONLY a raw JSON object. No markdown, no code blocks, no explanation. Just the JSON.

Format:
{"intent":"...","search_terms":[...],"casino_names":[...],"country_code":null,"is_listing":false,"is_comparison":false,"tables":[...]}

Fields:
- intent: one of casino_search, casino_review, casino_compare, bonuses, payments, crypto, licensing, news, geo, authors, faq, responsible_gambling, navigation, general
- search_terms: meaningful keywords from the message (lowercase, no stop words like "what", "is", "the")
- casino_names: specific casino names mentioned (preserve original capitalization). Fix obvious typos — e.g. "stak" → "Stake", "bcgame" → "BC.Game"
- country_code: 2-letter ISO code if a country is mentioned (e.g. "Canada" → "CA", "Germany" → "DE"), null otherwise
- is_listing: true if user wants to see all/list items (e.g. "show me all casinos", "what casinos do you have"), false if searching for specific
- is_comparison: true if comparing multiple casinos
- tables: which database tables to search (from the schema above)

If the user uses slang, typos, bad English, or abbreviations, understand their intent and provide the corrected search terms.
If the user references "it", "that one", "the first one", use conversation history to determine what they mean and include it in casino_names.

Examples:
"What casinos are available in Canada?" → {"intent":"geo","search_terms":[],"casino_names":[],"country_code":"CA","is_listing":true,"is_comparison":false,"tables":["casinos","countries"]}
"Tell me about Stake" → {"intent":"casino_search","search_terms":["stake"],"casino_names":["Stake"],"country_code":null,"is_listing":false,"is_comparison":false,"tables":["casinos","reviews"]}
"Compare Stake vs BC.Game" → {"intent":"casino_compare","search_terms":["stake","bc game"],"casino_names":["Stake","BC.Game"],"country_code":null,"is_listing":false,"is_comparison":true,"tables":["casinos","reviews"]}
"What is Level.casino?" → {"intent":"navigation","search_terms":["level.casino"],"casino_names":[],"country_code":null,"is_listing":false,"is_comparison":false,"tables":["pages"]}
"Any crypto casinos?" → {"intent":"crypto","search_terms":["crypto"],"casino_names":[],"country_code":null,"is_listing":true,"is_comparison":false,"tables":["casinos"]}
"stak bonus" → {"intent":"bonuses","search_terms":["stake","bonus"],"casino_names":["Stake"],"country_code":null,"is_listing":false,"is_comparison":false,"tables":["casinos"]}
"which 1 can i play in rwanda" → {"intent":"geo","search_terms":[],"casino_names":[],"country_code":"RW","is_listing":true,"is_comparison":false,"tables":["casinos","countries"]}
"what about the first one" → {"intent":"casino_search","search_terms":[],"casino_names":[],"country_code":null,"is_listing":false,"is_comparison":false,"tables":["casinos","reviews"]}`;

/**
 * Use LLM to understand user intent and extract search parameters
 * Falls back to keyword-based router if LLM fails
 */
export async function understand(env, message, conversationHistory = []) {
  const historyStr = conversationHistory.length > 0
    ? conversationHistory.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')
    : 'No previous messages.';

  try {
    if (!env.AI) {
      console.warn('Lummet understand: AI binding missing, using keyword fallback');
      return fallbackUnderstanding(message);
    }

        const result = await env.AI.run(MODEL, {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Conversation history:\n${historyStr}\n\nUser message: ${message}` }
      ],
      temperature: 0.1,
      max_tokens: 300,
      reasoning: { enabled: false }
    });

    let response = result?.response || result?.choices?.[0]?.message?.content || result?.output?.text || '';

    // Strip markdown code blocks if present
    response = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Extract JSON between first { and last }
    const firstBrace = response.indexOf('{');
    const lastBrace = response.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      console.warn('Lummet understand: no JSON found in response, using fallback');
      return fallbackUnderstanding(message);
    }

    const jsonStr = response.substring(firstBrace, lastBrace + 1);

    let plan;
    try {
      plan = JSON.parse(jsonStr);
    } catch (parseError) {
      // Try to fix common JSON issues
      let fixed = jsonStr
        .replace(/,\s*}/g, '}')        // Remove trailing commas
        .replace(/,\s*]/g, ']')        // Remove trailing commas in arrays
        .replace(/'/g, '"')            // Replace single quotes with double quotes
        .replace(/(\w+):/g, '"$1":')   // Quote unquoted keys
        .trim();
      try {
        plan = JSON.parse(fixed);
      } catch (secondError) {
        console.warn('Lummet understand: JSON parse failed, using fallback');
        return fallbackUnderstanding(message);
      }
    }

    console.log('Lummet understand plan:', JSON.stringify(plan));

    return normalizePlan(plan);
  } catch (error) {
    console.error('Lummet understand error:', error.message);
    return fallbackUnderstanding(message);
  }
}

/**
 * Normalize the plan from LLM output
 */
function normalizePlan(plan) {
  const validTables = ['casinos', 'reviews', 'review_blocks', 'news', 'pages', 'faqs', 'authors', 'countries', 'categories', 'geo_rules', 'seo_meta'];

  return {
    intent: plan.intent || 'general',
    search_terms: Array.isArray(plan.search_terms)
      ? plan.search_terms.map(t => String(t).toLowerCase()).filter(t => t.length > 0)
      : [],
    casino_names: Array.isArray(plan.casino_names)
      ? plan.casino_names.map(n => String(n).trim()).filter(n => n.length > 0)
      : [],
    country_code: plan.country_code || null,
    is_listing: Boolean(plan.is_listing),
    is_comparison: Boolean(plan.is_comparison),
    tables: Array.isArray(plan.tables)
      ? plan.tables.filter(t => validTables.includes(t))
      : []
  };
}

/**
 * Fallback to keyword-based understanding (from router.js)
 */
function fallbackUnderstanding(message) {
  const { intent } = detectIntent(message);
  const entities = extractEntities(message);

  return {
    intent,
    search_terms: extractSearchTermsFallback(message),
    casino_names: entities.casinoNames || [],
    country_code: entities.countryCodes?.[0] || null,
    is_listing: isListingFallback(message),
    is_comparison: entities.isComparison || false,
    tables: []
  };
}

function extractSearchTermsFallback(message) {
  const text = message.toLowerCase().trim();
  const stopWords = ['what','which','how','why','when','where','who','is','are','was','were','be','do','does','can','could','should','would','will','the','a','an','this','that','about','tell','show','give','list','find','me','us','please','help','want','need','know','casino','casinos','review','reviews','page','pages','my','your','in','on','at','to','for','of','with','from','by','and','or','but','country','countries'];
  const words = text.split(/[^a-z0-9.]+/i).filter(w => w.length > 1);
  return words.filter(w => !stopWords.includes(w));
}

function isListingFallback(message) {
  const text = message.toLowerCase();
  return text.includes('list') || text.includes('all casinos') || text.includes('available casinos') || text.includes('top casinos') || text.includes('best casinos') || text.includes('show me') || text.includes('what casinos') || text.includes('which casinos');
}
