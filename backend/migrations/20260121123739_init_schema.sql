-- =====================================================================
-- 002_posts_add_fts.sql
-- Add full-text search for posts.title + posts.content_markdown
-- =====================================================================

-- 1) extensions
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2) add tsvector column
ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS search_tsv tsvector NOT NULL DEFAULT ''::tsvector;

-- 3) FTS indexes
CREATE INDEX IF NOT EXISTS idx_posts_search_tsv
    ON posts USING GIN (search_tsv);

-- обычно полезнее: FTS только по опубликованным (меньше индекс, быстрее)
CREATE INDEX IF NOT EXISTS idx_posts_search_tsv_published
    ON posts USING GIN (search_tsv)
    WHERE is_published = true;

-- 4) trigger function: updated_at + search_tsv
CREATE OR REPLACE FUNCTION posts_set_updated_at_and_search_tsv()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();

    NEW.search_tsv =
        setweight(to_tsvector('russian', unaccent(coalesce(NEW.title, ''))), 'A') ||
        setweight(to_tsvector('english', unaccent(coalesce(NEW.title, ''))), 'A') ||
        setweight(to_tsvector('russian', unaccent(coalesce(NEW.content_markdown, ''))), 'C') ||
        setweight(to_tsvector('english', unaccent(coalesce(NEW.content_markdown, ''))), 'C');

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) replace old trigger (updated_at only) with the new one
DROP TRIGGER IF EXISTS trg_posts_set_updated_at ON posts;

DROP TRIGGER IF EXISTS trg_posts_set_updated_at_and_search_tsv ON posts;
CREATE TRIGGER trg_posts_set_updated_at_and_search_tsv
    BEFORE INSERT OR UPDATE ON posts
                         FOR EACH ROW
                         EXECUTE FUNCTION posts_set_updated_at_and_search_tsv();

-- 6) backfill existing rows (важно, иначе старые посты не будут искаться)
UPDATE posts
SET search_tsv =
        setweight(to_tsvector('russian', unaccent(coalesce(title, ''))), 'A') ||
        setweight(to_tsvector('english', unaccent(coalesce(title, ''))), 'A') ||
        setweight(to_tsvector('russian', unaccent(coalesce(content_markdown, ''))), 'C') ||
        setweight(to_tsvector('english', unaccent(coalesce(content_markdown, ''))), 'C');
