CREATE TABLE post_bookmarks
(
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    post_id    BIGINT      NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX post_bookmarks_user_id_idx ON post_bookmarks (user_id);
CREATE INDEX post_bookmarks_post_id_idx ON post_bookmarks (post_id);

CREATE TABLE post_ratings
(
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    post_id    BIGINT      NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    value      SMALLINT    NOT NULL CHECK (value >= 1 AND value <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX post_ratings_user_id_idx ON post_ratings (user_id);
CREATE INDEX post_ratings_post_id_idx ON post_ratings (post_id);

CREATE TABLE post_progress
(
    user_id      BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    post_id      BIGINT      NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    is_completed BOOLEAN     NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ NULL,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX post_progress_user_id_idx ON post_progress (user_id);
CREATE INDEX post_progress_post_id_idx ON post_progress (post_id);
CREATE INDEX post_progress_completed_idx ON post_progress (user_id, is_completed);
