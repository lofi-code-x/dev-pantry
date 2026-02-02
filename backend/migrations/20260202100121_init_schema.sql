-- Minimal quiz: single-correct options per question

CREATE TABLE post_quiz_questions
(
    id            BIGSERIAL PRIMARY KEY,
    post_id       BIGINT      NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    question_text TEXT        NOT NULL,
    sort_order    INT         NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX post_quiz_questions_post_order_idx
    ON post_quiz_questions (post_id, sort_order, id);

CREATE TABLE post_quiz_options
(
    id           BIGSERIAL PRIMARY KEY,
    question_id  BIGINT      NOT NULL REFERENCES post_quiz_questions (id) ON DELETE CASCADE,
    option_text  TEXT        NOT NULL,
    is_correct   BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX post_quiz_options_question_idx
    ON post_quiz_options (question_id, id);

-- Enforce at most one correct option per question
CREATE UNIQUE INDEX post_quiz_options_one_correct_idx
    ON post_quiz_options (question_id)
    WHERE is_correct = true;
