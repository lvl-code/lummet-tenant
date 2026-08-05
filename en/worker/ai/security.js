// =====================================================
// LUMMET AI — Security Layer
// =====================================================

const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_REQUESTS = 30;

const INJECTION_PATTERNS = [
  /ignore (all |previous |prior )?(instructions|prompts|rules)/i,
  /disregard (all |previous |prior )?(instructions|prompts|rules)/i,
  /you are (now )?(not )?(an? )?(AI|assistant|chatbot|language model)/i,
  /pretend (you are|to be)/i,
  /act as (if you are|a)/i,
  /reveal (your|the) (system )?prompt/i,
  /show (me )?(your|the) (system )?prompt/i,
  /what (is|are) (your|the) (system )?(prompt|instructions|rules)/i,
  /repeat (everything|all|the text) (above|before)/i,
  /output (your|the) (system )?(prompt|instructions)/i,
  /print (your|the) (system )?(prompt|instructions)/i,
  /what (database|sql|query|schema)/i,
  /show (me )?(the )?(database|sql|schema|raw json)/i,
  /expose (the )?(database|schema|implementation)/i,
  /\b(DROP|DELETE|INSERT|UPDATE|SELECT|CREATE|ALTER)\b.*\b(FROM|INTO|TABLE|SET|WHERE)\b/i,
];

/**
 * Sanitize and validate user input
 */
export function validateInput(message) {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message is required' };
  }

  const trimmed = message.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` };
  }

  const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return { valid: true, sanitized };
}

/**
 * Detect prompt injection attempts
 */
export function detectInjection(message) {
  const detected = [];
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      detected.push(pattern.source);
    }
  }
  return { isInjection: detected.length > 0, patterns: detected };
}

/**
 * Hash IP for rate limiting (SHA-256)
 */
export async function hashIP(ip) {
  if (!ip) return '';
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check rate limit for AI chat
 */
export async function checkRateLimit(db, ipHash) {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();

  await db.prepare(`
    DELETE FROM ai_rate_limits WHERE created_at < ?
  `).bind(windowStart).run();

  const row = await db.prepare(`
    SELECT COUNT(*) as c FROM ai_rate_limits
    WHERE ip_hash = ? AND created_at >= ?
  `).bind(ipHash, windowStart).first();

  return (row?.c || 0) < RATE_LIMIT_MAX_REQUESTS;
}

/**
 * Log a request for rate limiting
 */
export async function logRequest(db, ipHash) {
  await db.prepare(`
    INSERT INTO ai_rate_limits (ip_hash, created_at) VALUES (?, ?)
  `).bind(ipHash, new Date().toISOString()).run();
}
