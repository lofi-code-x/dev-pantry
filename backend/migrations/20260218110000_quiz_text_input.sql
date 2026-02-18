ALTER TABLE post_quiz_questions
    ADD COLUMN question_type TEXT NOT NULL DEFAULT 'single_choice',
    ADD COLUMN text_validation JSONB;

ALTER TABLE post_quiz_questions
    ADD CONSTRAINT post_quiz_questions_question_type_check
        CHECK (question_type IN ('single_choice', 'text_input'));

ALTER TABLE post_quiz_answers
    ADD COLUMN answer_text TEXT;

ALTER TABLE post_quiz_answers
    ALTER COLUMN option_id DROP NOT NULL;

ALTER TABLE post_quiz_answers
    ADD CONSTRAINT post_quiz_answers_one_answer_check
        CHECK (
            (option_id IS NOT NULL AND answer_text IS NULL) OR
            (option_id IS NULL AND answer_text IS NOT NULL)
        );
