// =====================================================
// LUMMET AI — Main Assistant (Streaming + Non-Streaming)
// =====================================================

import { detectIntent, extractEntities } from './router.js';
import { retrieve } from './retrieval.js';
import { buildSystemPrompt, buildMessages } from './prompt.js';
import { getRecentHistory, appendMessages } from './memory.js';
import { validateInput, detectInjection } from './security.js';

const MODEL = '@cf/zai-org/glm-4.7-flash';
const MAX_TOKENS = 800;
const TEMPERATURE = 0.3;

const COUNTRY_NAMES = {
  RW:'Rwanda',US:'United States',CA:'Canada',GB:'United Kingdom',DE:'Germany',FR:'France',
  IT:'Italy',ES:'Spain',NL:'Netherlands',AU:'Australia',NZ:'New Zealand',JP:'Japan',
  CN:'China',IN:'India',BR:'Brazil',MX:'Mexico',ZA:'South Africa',NG:'Nigeria',KE:'Kenya',
  EG:'Egypt',SE:'Sweden',NO:'Norway',DK:'Denmark',FI:'Finland',PL:'Poland',PT:'Portugal',
  GR:'Greece',TR:'Turkey',RU:'Russia',UA:'Ukraine',AE:'United Arab Emirates',SA:'Saudi Arabia',
  QA:'Qatar',KR:'South Korea',TH:'Thailand',VN:'Vietnam',PH:'Philippines',ID:'Indonesia',
  MY:'Malaysia',SG:'Singapore',AR:'Argentina',CL:'Chile',CO:'Colombia',PE:'Peru',AT:'Austria',
  CH:'Switzerland',IE:'Ireland',BE:'Belgium',CZ:'Czech Republic',HU:'Hungary',RO:'Romania',
  BG:'Bulgaria',HR:'Croatia',MT:'Malta',CY:'Cyprus',LU:'Luxembourg',IS:'Iceland'
};

export const aiAssistant = {
  /**
   * Non-streaming chat (backward compatible)
   */
  async chat(env, message, userContext = {}) {
    const country = userContext.country || 'RW';
    const sessionId = userContext.sessionId || 'anonymous';
    const userId = userContext.userId || null;
    const db = env.DB;

    // 1. Validate input
    const validation = validateInput(message);
    if (!validation.valid) {
      return { success: false, answer: validation.error, intent: null };
    }
    const sanitized = validation.sanitized;

    // 2. Detect injection
    const injection = detectInjection(sanitized);
    if (injection.isInjection) {
      return {
        success: true,
        answer: "I'm Lummet AI, here to help you explore Level.casino's editorial content. I can help you find casino reviews, compare casinos, check bonuses, or answer questions about payment methods. What would you like to know?",
        intent: 'security_block'
      };
    }

    // 3. Detect intent and entities
    const { intent } = detectIntent(sanitized);
    const entities = extractEntities(sanitized);

    // 4. Get conversation history
    const conversationHistory = await getRecentHistory(db, sessionId, 6);

    // 5. Retrieve from database
    const context = await retrieve(env, sanitized, country, intent, entities, conversationHistory);

    // 6. Build prompt
    const systemPrompt = buildSystemPrompt(context, country, intent, conversationHistory);
    const messages = buildMessages(systemPrompt, sanitized, conversationHistory);

    // 7. Run inference
    let answer;
    try {
      if (!env.AI) {
        answer = generateFallback(sanitized, context, country);
      } else {
        const result = await env.AI.run(MODEL, {
          messages,
          temperature: TEMPERATURE,
          max_tokens: MAX_TOKENS
        });

        answer = result?.response ||
                result?.choices?.[0]?.message?.content ||
                result?.result?.response ||
                result?.output?.text ||
                null;

        if (!answer) {
          answer = generateFallback(sanitized, context, country);
        }
      }
    } catch (error) {
      console.error('Lummet AI inference error:', error.message);
      answer = generateFallback(sanitized, context, country);
    }

    answer = answer.trim();

    // 8. Save to conversation memory
    try {
      await appendMessages(db, sessionId, sanitized, answer, userId);
    } catch (e) {
      console.error('Lummet memory save error:', e.message);
    }

    return { success: true, answer, intent, sessionId };
  },

  /**
   * Streaming chat — returns SSE Response
   */
  async chatStream(env, message, userContext = {}) {
    const country = userContext.country || 'RW';
    const sessionId = userContext.sessionId || 'anonymous';
    const userId = userContext.userId || null;
    const db = env.DB;

    const validation = validateInput(message);
    if (!validation.valid) {
      return createSSEStream([
        { type: 'error', content: validation.error },
        { type: 'done' }
      ]);
    }
    const sanitized = validation.sanitized;

    const injection = detectInjection(sanitized);
    if (injection.isInjection) {
      return createSSEStream([
        { type: 'delta', content: "I'm Lummet AI, here to help you explore Level.casino's editorial content. What would you like to know?" },
        { type: 'done' }
      ]);
    }

    const { intent } = detectIntent(sanitized);
    const entities = extractEntities(sanitized);

    const conversationHistory = await getRecentHistory(db, sessionId, 6);

    const context = await retrieve(env, sanitized, country, intent, entities, conversationHistory);

    const systemPrompt = buildSystemPrompt(context, country, intent, conversationHistory);
    const messages = buildMessages(systemPrompt, sanitized, conversationHistory);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let fullAnswer = '';

        try {
          if (!env.AI) {
            fullAnswer = generateFallback(sanitized, context, country);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: fullAnswer })}\n\n`));
          } else {
            const result = await env.AI.run(MODEL, {
              messages,
              temperature: TEMPERATURE,
              max_tokens: MAX_TOKENS,
              stream: true
            });

            if (result instanceof ReadableStream) {
              const reader = result.getReader();
              const decoder = new TextDecoder();

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      if (data.response || data.token || data.delta?.text) {
                        const token = data.response || data.token || data.delta?.text || '';
                        if (token) {
                          fullAnswer += token;
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: token })}\n\n`));
                        }
                      }
                    } catch {
                      // Skip non-JSON lines
                    }
                  }
                }
              }
            } else {
              fullAnswer = result?.response ||
                          result?.choices?.[0]?.message?.content ||
                          generateFallback(sanitized, context, country);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: fullAnswer })}\n\n`));
            }
          }
        } catch (error) {
          console.error('Lummet stream error:', error.message);
          fullAnswer = generateFallback(sanitized, context, country);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: fullAnswer })}\n\n`));
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', intent, sessionId })}\n\n`));

        try {
          await appendMessages(db, sessionId, sanitized, fullAnswer, userId);
        } catch (e) {
          console.error('Lummet memory save error:', e.message);
        }

        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }
};

function createSSEStream(events) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      controller.close();
    }
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache'
    }
  });
}

function generateFallback(message, context, country) {
  const countryNameStr = COUNTRY_NAMES[country] || country || 'your country';

  if (context.casinos.length > 0) {
    const list = context.casinos.slice(0, 5).map((c, i) =>
      `${i + 1}. ${c.name} — ⭐ ${c.rating || 'N/A'}/5 — ${context.geoStatuses[c.slug] === 'allowed' ? '✓ Available' : '✕ Not available'} in ${countryNameStr}\n   🔗 https://level.casino/en/casino/${c.slug}`
    ).join('\n\n');
    return `Here are the casinos I found on Level.casino:\n\n${list}\n\nYou can read the full reviews by following the links. I can also compare these casinos or show you their bonus details.`;
  }

  if (context.reviews.length > 0) {
    const list = context.reviews.slice(0, 5).map((r, i) =>
      `${i + 1}. ${r.title} — ⭐ ${r.rating || 'N/A'}/5\n   🔗 https://level.casino/en/review/${r.slug}`
    ).join('\n\n');
    return `Here are the reviews I found:\n\n${list}\n\nWould you like me to summarize any of these reviews?`;
  }

  if (context.faqs.length > 0) {
    const faq = context.faqs[0];
    return `${faq.question}\n\n${faq.answer}`;
  }

  return `I couldn't find that information in the Level.casino database. You can browse our independent casino reviews, guides, news, and responsible gambling resources at https://level.casino/en/ — or contact us at elie@level.casino and we'll be happy to help.`;
}
