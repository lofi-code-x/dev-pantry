CREATE TABLE post_quiz_attempts
(
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    post_id    BIGINT      NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    is_passed  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX post_quiz_attempts_user_post_idx
    ON post_quiz_attempts (user_id, post_id, created_at DESC);

CREATE TABLE post_quiz_answers
(
    attempt_id  BIGINT NOT NULL REFERENCES post_quiz_attempts (id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL REFERENCES post_quiz_questions (id) ON DELETE CASCADE,
    option_id   BIGINT NOT NULL REFERENCES post_quiz_options (id) ON DELETE CASCADE,
    PRIMARY KEY (attempt_id, question_id)
);

CREATE INDEX post_quiz_answers_attempt_idx
    ON post_quiz_answers (attempt_id);
