-- =====================================================
-- 0015: Triggers
-- =====================================================
-- Keep a review's rating in step with its casino. Both exist on the live
-- databases; they are defined here so a new database behaves the same.

CREATE TRIGGER IF NOT EXISTS trg_casino_rating_to_reviews AFTER UPDATE OF rating ON casinos
BEGIN
  UPDATE reviews SET rating = NEW.rating, updated_at = CURRENT_TIMESTAMP WHERE casino_slug = NEW.slug;
END;

CREATE TRIGGER IF NOT EXISTS trg_review_rating_from_casino AFTER INSERT ON reviews
BEGIN
  UPDATE reviews SET rating = (SELECT rating FROM casinos WHERE slug = NEW.casino_slug) WHERE id = NEW.id AND EXISTS (SELECT 1 FROM casinos WHERE slug = NEW.casino_slug);
END;
