CREATE TABLE analytics_events
(
    id         BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    visitor_id UUID        NOT NULL,
    user_id    BIGINT      NULL REFERENCES users (id) ON DELETE SET NULL,
    path       TEXT        NOT NULL,
    user_agent TEXT        NULL
);

CREATE INDEX analytics_events_created_at_idx
    ON analytics_events (created_at);

CREATE INDEX analytics_events_created_at_visitor_id_idx
    ON analytics_events (created_at, visitor_id);

CREATE INDEX analytics_events_created_at_user_id_idx
    ON analytics_events (created_at, user_id);
