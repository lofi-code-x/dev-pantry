CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Файлы
CREATE TABLE IF NOT EXISTS uploads
(
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    key          TEXT        NOT NULL UNIQUE,  -- "images/<uuid>.webp"
    content_type TEXT        NOT NULL,
    size_bytes   BIGINT      NOT NULL,
    created_by   BIGINT      REFERENCES users (id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS uploads_created_by_created_at_idx
    ON uploads (created_by, created_at DESC);

-- 2) Картинки постов
CREATE TABLE IF NOT EXISTS post_images
(
    post_id    BIGINT      NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    upload_id  UUID        NOT NULL REFERENCES uploads (id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, upload_id)
    );

CREATE INDEX IF NOT EXISTS post_images_post_id_created_at_idx
    ON post_images (post_id, created_at DESC);

-- 3) Картинки модулей
CREATE TABLE IF NOT EXISTS module_images
(
    module_id  BIGINT      NOT NULL REFERENCES modules (id) ON DELETE CASCADE,
    upload_id  UUID        NOT NULL REFERENCES uploads (id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (module_id, upload_id)
    );

CREATE INDEX IF NOT EXISTS module_images_module_id_created_at_idx
    ON module_images (module_id, created_at DESC);

-- 4) Аватар пользователя (один активный)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_upload_id UUID
    REFERENCES uploads (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS users_avatar_upload_id_idx
    ON users (avatar_upload_id);
