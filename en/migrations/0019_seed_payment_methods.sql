-- =====================================================
-- 0019: Seed: payment methods
-- =====================================================
-- The payment methods casinos can list. Icons are served from /static/images/payments/.
--
-- Seeds only add rows that are missing (INSERT OR IGNORE, or NOT EXISTS where
-- the table has no unique key), so a row an editor changed is never overwritten.
-- On a live site a seed row that was deleted on purpose is added back, so run
-- these files on new databases only.

INSERT OR IGNORE INTO payment_methods (slug, name, icon_url, method_type, description, sort_order) VALUES
  ('visa', 'Visa', '/static/images/payments/visa.svg', 'card', 'Visa is one of the most widely accepted card networks at online casinos, with instant deposits and typically 1-3 day withdrawals.', 10),
  ('mastercard', 'Mastercard', '/static/images/payments/mastercard.svg', 'card', 'Mastercard is accepted at nearly every licensed online casino, offering instant deposits worldwide.', 20),
  ('skrill', 'Skrill', '/static/images/payments/skrill.svg', 'ewallet', 'Skrill is a popular e-wallet for online casinos, known for fast withdrawals and wide international support.', 30),
  ('neteller', 'Neteller', '/static/images/payments/neteller.svg', 'ewallet', 'Neteller is an e-wallet frequently used at casinos for its quick payout times.', 40),
  ('paypal', 'PayPal', '/static/images/payments/paypal.svg', 'ewallet', 'PayPal is accepted at a growing number of licensed casinos, valued for its buyer protection and familiarity.', 50),
  ('apple-pay', 'Apple Pay', '/static/images/payments/apple-pay.svg', 'ewallet', 'Apple Pay lets iOS users deposit instantly using stored cards, without re-entering card details.', 60),
  ('google-pay', 'Google Pay', '/static/images/payments/google-pay.svg', 'ewallet', 'Google Pay offers instant, card-free deposits for Android users.', 70),
  ('paysafecard', 'Paysafecard', '/static/images/payments/paysafecard.svg', 'card', 'Paysafecard is a prepaid voucher method, useful for depositing without a bank or credit card.', 80),
  ('neosurf', 'Neosurf', '/static/images/payments/neosurf.svg', 'card', 'Neosurf is a prepaid voucher accepted at many casinos as a card-free deposit option.', 90),
  ('bitcoin', 'Bitcoin', '/static/images/payments/bitcoin.svg', 'crypto', 'Bitcoin deposits and withdrawals are typically faster than traditional banking methods and widely supported at crypto-friendly casinos.', 100);
