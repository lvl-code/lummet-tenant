// worker/database/newsletter.js
// Storage for newsletter signups. See migrations/0038 for the table.

export async function getSubscriberByEmail(db, email) {
  return db.prepare(`
    SELECT * FROM newsletter_subscribers
    WHERE email = ?
    LIMIT 1
  `).bind(email).first();
}

export async function getSubscriberByToken(db, token) {
  return db.prepare(`
    SELECT * FROM newsletter_subscribers
    WHERE token = ?
    LIMIT 1
  `).bind(token).first();
}

export async function createSubscriber(db, email, token) {
  return db.prepare(`
    INSERT INTO newsletter_subscribers (email, token, status)
    VALUES (?, ?, 'pending')
  `).bind(email, token).run();
}

// Re-issues a fresh confirmation token for someone who signed up
// before but never confirmed and is signing up again.
export async function refreshSubscriberToken(db, id, token) {
  return db.prepare(`
    UPDATE newsletter_subscribers
    SET token = ?
    WHERE id = ?
  `).bind(token, id).run();
}

export async function confirmSubscriber(db, id) {
  return db.prepare(`
    UPDATE newsletter_subscribers
    SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(id).run();
}

export async function unsubscribeSubscriber(db, id) {
  return db.prepare(`
    UPDATE newsletter_subscribers
    SET status = 'unsubscribed', unsubscribed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(id).run();
}

// Lets someone who previously unsubscribed sign up again.
export async function resubscribeSubscriber(db, id) {
  return db.prepare(`
    UPDATE newsletter_subscribers
    SET status = 'pending', unsubscribed_at = NULL
    WHERE id = ?
  `).bind(id).run();
}
