CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'editor' ,'user');

CREATE TABLE users
(
    id            BIGSERIAL PRIMARY KEY,
    login         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    role          user_role   NOT NULL DEFAULT 'user',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);