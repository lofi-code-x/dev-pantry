CREATE TABLE user_contacts
(
    user_id    BIGINT      PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    email      TEXT        NULL,
    website    TEXT        NULL,
    github     TEXT        NULL,
    telegram   TEXT        NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
