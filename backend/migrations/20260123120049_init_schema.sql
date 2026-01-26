CREATE TABLE modules
(
    id           BIGSERIAL PRIMARY KEY,
    title        TEXT        NOT NULL,
    description  TEXT,
    author_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    rating       BIGINT      NOT NULL DEFAULT 0,
    is_published BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX modules_published_created_idx
    ON modules (is_published, created_at DESC);

CREATE TABLE module_items
(
    id         BIGSERIAL PRIMARY KEY,
    module_id  BIGINT      NOT NULL REFERENCES modules (id) ON DELETE CASCADE,
    post_id    BIGINT      NOT NULL REFERENCES posts (id) ON DELETE RESTRICT,
    sort_order INT         NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- один пост в одном модуле — один раз
CREATE UNIQUE INDEX module_items_unique
    ON module_items (module_id, post_id);

-- быстрая выдача items по модулю в нужном порядке
CREATE INDEX module_items_order_idx
    ON module_items (module_id, sort_order, id);
