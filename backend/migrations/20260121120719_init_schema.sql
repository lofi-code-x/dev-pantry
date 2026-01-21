CREATE TABLE IF NOT EXISTS posts
(
    id               BIGSERIAL PRIMARY KEY,
    title            TEXT        NOT NULL,
    content_markdown TEXT        NOT NULL,
    preview_text     TEXT        NOT NULL,
    category_tag     TEXT        NOT NULL
    REFERENCES categories (tag)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
    author           TEXT        NOT NULL,
    rating           BIGINT      NOT NULL DEFAULT 0,
    is_published     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Быстрый список постов по категории + фильтр published + сортировка по дате
CREATE INDEX IF NOT EXISTS idx_posts_cat_published_created_at
    ON posts (category_tag, is_published, created_at DESC);

-- Если часто запрашиваешь “все опубликованные” (лента/главная) по дате
CREATE INDEX IF NOT EXISTS idx_posts_published_created_at
    ON posts (is_published, created_at DESC);

-- Быстрая выборка/страница автора (и/или фильтр published у автора)
CREATE INDEX IF NOT EXISTS idx_posts_author_created_at
    ON posts (author, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_author_published_created_at
    ON posts (author, is_published, created_at DESC);

-- Если есть сортировка/топы по рейтингу (обычно только для опубликованных)
CREATE INDEX IF NOT EXISTS idx_posts_published_rating
    ON posts (is_published, rating DESC);

-- Опционально: для кейса “топ в категории”
CREATE INDEX IF NOT EXISTS idx_posts_cat_published_rating
    ON posts (category_tag, is_published, rating DESC);


CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS
$$
BEGIN
    NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_posts_set_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();



