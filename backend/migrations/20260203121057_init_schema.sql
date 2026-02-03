CREATE TABLE user_xp_events
(
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind       TEXT        NOT NULL CHECK (kind IN (
                                                    'post_completed',
                                                    'module_completed',
                                                    'quiz_passed',
                                                    'streak_daily'
        )),
    ref_type   TEXT        NOT NULL,
    ref_id     BIGINT      NOT NULL,
    delta      INTEGER     NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX user_xp_events_unique
    ON user_xp_events (user_id, kind, ref_type, ref_id);

CREATE INDEX user_xp_events_user_created_idx
    ON user_xp_events (user_id, created_at DESC);

CREATE TABLE user_stats
(
    user_id          BIGINT      PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    total_xp         INTEGER     NOT NULL DEFAULT 0,
    posts_completed  BIGINT      NOT NULL DEFAULT 0,
    modules_completed BIGINT     NOT NULL DEFAULT 0,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
