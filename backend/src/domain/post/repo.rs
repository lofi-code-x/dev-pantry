use crate::domain::post::dto::{
    InsertParams, InsertQuizOptionParams, InsertQuizQuestionParams, SearchParams, UpdateParams,
    UpdateQuizOptionParams, UpdateQuizQuestionParams,
};
use crate::domain::post::model::{Post, PostQuizOption, PostQuizQuestion, QuizAnswer};
use crate::error;
use sqlx::{PgPool, Row};

pub async fn search(pool: &PgPool, params: SearchParams) -> error::Result<Vec<Post>> {
    Ok(sqlx::query_as::<_, Post>(
        r#"
        WITH query AS (
          SELECT
            (
              websearch_to_tsquery('russian', unaccent($1)) ||
              websearch_to_tsquery('english', unaccent($1))
            ) AS tsq
        )
        SELECT
          p.id,
          p.title,
          p.category_tag,
          p.content_markdown,
          p.preview_text,
          p.author,
          p.rating,
          p.is_published,
          p.created_at,
          p.updated_at
        FROM posts p
        CROSS JOIN query
        WHERE
          p.is_published = true
          AND ($2::text IS NULL OR p.category_tag = $2::text)
          AND (
            $3::bool = false
            OR (p.search_tsv @@ query.tsq)
          )
        ORDER BY
          CASE WHEN $3::bool THEN ts_rank_cd(p.search_tsv, query.tsq) END DESC NULLS LAST,
          p.created_at DESC
        LIMIT $4::bigint OFFSET $5::bigint
        "#,
    )
    .bind(params.query) // $1 query text
    .bind(params.tag) // $2 tag or NULL
    .bind(params.has_query) // $3 enable/disable FTS part
    .bind((params.limit + 1) as i64) // $4 (берём +1 для next-page)
    .bind(params.offset as i64) // $5
    .fetch_all(pool)
    .await?)
}

pub async fn select_by_id(pool: &PgPool, id: i64) -> error::Result<Option<Post>> {
    Ok(sqlx::query_as::<_, Post>(
        r#"
        SELECT
            id,
            title,
            content_markdown,
            preview_text,
            category_tag,
            author,
            rating,
            is_published,
            created_at,
            updated_at
        FROM posts
        WHERE id = $1 AND is_published = true
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?)
}

pub async fn insert(pool: &PgPool, params: InsertParams) -> error::Result<i64> {
    Ok(sqlx::query_scalar::<_, i64>(
        r#"
        INSERT INTO posts (
            title,
            content_markdown,
            preview_text,
            category_tag,
            author,
            is_published
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        "#,
    )
    .bind(params.title)
    .bind(params.content_markdown)
    .bind(params.preview_text)
    .bind(params.category_tag)
    .bind(params.author)
    .bind(params.is_published)
    .fetch_one(pool)
    .await?)
}

pub async fn update_by_id(
    pool: &PgPool,
    params: UpdateParams,
    id: i64,
) -> error::Result<Option<i64>> {
    Ok(sqlx::query_scalar::<_, i64>(
        r#"
        UPDATE posts
        SET
            title            = $1,
            content_markdown = $2,
            preview_text     = $3,
            category_tag     = $4,
            author           = $5,
            updated_at       = NOW()
        WHERE id = $6
        RETURNING id
        "#,
    )
    .bind(params.title)
    .bind(params.content_markdown)
    .bind(params.preview_text)
    .bind(params.category_tag)
    .bind(params.author)
    .bind(id)
    .fetch_optional(pool)
    .await?)
}

pub async fn set_public_by_id(pool: &PgPool, id: i64, is_published: bool) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
        UPDATE posts
        SET
            is_published = $1,
            updated_at   = NOW()
        WHERE id = $2
        "#,
    )
    .bind(is_published)
    .bind(id)
    .execute(pool)
    .await?
    .rows_affected())
}

pub async fn delete_by_id(pool: &PgPool, id: i64) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
        DELETE FROM posts
        WHERE id = $1
        "#,
    )
    .bind(id)
    .execute(pool)
    .await?
    .rows_affected())
}

// -------------------------------- Quiz ----------------------------------

pub async fn select_quiz_questions_by_post_id(
    pool: &PgPool,
    post_id: i64,
) -> error::Result<Vec<PostQuizQuestion>> {
    Ok(sqlx::query_as::<_, PostQuizQuestion>(
        r#"
        SELECT
          id,
          post_id,
          question_text,
          sort_order,
          created_at
        FROM post_quiz_questions
        WHERE post_id = $1
        ORDER BY sort_order ASC, id ASC
        "#,
    )
    .bind(post_id)
    .fetch_all(pool)
    .await?)
}

pub async fn select_quiz_options_by_question_ids(
    pool: &PgPool,
    question_ids: &[i64],
) -> error::Result<Vec<PostQuizOption>> {
    if question_ids.is_empty() {
        return Ok(vec![]);
    }

    Ok(sqlx::query_as::<_, PostQuizOption>(
        r#"
        SELECT
          id,
          question_id,
          option_text,
          is_correct
        FROM post_quiz_options
        WHERE question_id = ANY($1::bigint[])
        ORDER BY id ASC
        "#,
    )
    .bind(question_ids)
    .fetch_all(pool)
    .await?)
}

pub async fn insert_quiz_question(
    pool: &PgPool,
    params: InsertQuizQuestionParams,
) -> error::Result<i64> {
    Ok(sqlx::query_scalar::<_, i64>(
        r#"
        INSERT INTO post_quiz_questions (
            post_id,
            question_text,
            sort_order
        )
        VALUES ($1, $2, $3)
        RETURNING id
        "#,
    )
    .bind(params.post_id)
    .bind(params.question_text)
    .bind(params.sort_order)
    .fetch_one(pool)
    .await?)
}

pub async fn update_quiz_question_by_id(
    pool: &PgPool,
    id: i64,
    params: UpdateQuizQuestionParams,
) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
        UPDATE post_quiz_questions
        SET
            question_text = $1,
            sort_order    = $2
        WHERE id = $3
        "#,
    )
    .bind(params.question_text)
    .bind(params.sort_order)
    .bind(id)
    .execute(pool)
    .await?
    .rows_affected())
}

pub async fn delete_quiz_question_by_id(pool: &PgPool, id: i64) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
        DELETE FROM post_quiz_questions
        WHERE id = $1
        "#,
    )
    .bind(id)
    .execute(pool)
    .await?
    .rows_affected())
}

pub async fn insert_quiz_option(
    pool: &PgPool,
    params: InsertQuizOptionParams,
) -> error::Result<i64> {
    Ok(sqlx::query_scalar::<_, i64>(
        r#"
        INSERT INTO post_quiz_options (
            question_id,
            option_text,
            is_correct
        )
        VALUES ($1, $2, $3)
        RETURNING id
        "#,
    )
    .bind(params.question_id)
    .bind(params.option_text)
    .bind(params.is_correct)
    .fetch_one(pool)
    .await?)
}

pub async fn update_quiz_option_by_id(
    pool: &PgPool,
    id: i64,
    params: UpdateQuizOptionParams,
) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
        UPDATE post_quiz_options
        SET
            option_text = $1,
            is_correct  = $2
        WHERE id = $3
        "#,
    )
    .bind(params.option_text)
    .bind(params.is_correct)
    .bind(id)
    .execute(pool)
    .await?
    .rows_affected())
}

pub async fn delete_quiz_option_by_id(pool: &PgPool, id: i64) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
        DELETE FROM post_quiz_options
        WHERE id = $1
        "#,
    )
    .bind(id)
    .execute(pool)
    .await?
    .rows_affected())
}

pub async fn select_correct_option_ids_by_post_id(
    pool: &PgPool,
    post_id: i64,
) -> error::Result<Vec<(i64, i64)>> {
    let rows = sqlx::query(
        r#"
        SELECT
          q.id AS question_id,
          o.id AS option_id
        FROM post_quiz_questions q
        JOIN post_quiz_options o
          ON o.question_id = q.id
         AND o.is_correct = true
        WHERE q.post_id = $1
        ORDER BY q.sort_order ASC, q.id ASC
        "#,
    )
    .bind(post_id)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| (r.get::<i64, _>("question_id"), r.get::<i64, _>("option_id")))
        .collect())
}

pub async fn insert_quiz_attempt(
    pool: &PgPool,
    user_id: i64,
    post_id: i64,
    is_passed: bool,
) -> error::Result<i64> {
    Ok(sqlx::query_scalar::<_, i64>(
        r#"
        INSERT INTO post_quiz_attempts (user_id, post_id, is_passed)
        VALUES ($1, $2, $3)
        RETURNING id
        "#,
    )
    .bind(user_id)
    .bind(post_id)
    .bind(is_passed)
    .fetch_one(pool)
    .await?)
}

pub async fn insert_quiz_answers(
    pool: &PgPool,
    attempt_id: i64,
    answers: &[QuizAnswer],
) -> error::Result<()> {
    if answers.is_empty() {
        return Ok(());
    }

    let mut qb = sqlx::QueryBuilder::new(
        "INSERT INTO post_quiz_answers (attempt_id, question_id, option_id) ",
    );
    qb.push_values(answers, |mut b, a| {
        b.push_bind(attempt_id)
            .push_bind(a.question_id)
            .push_bind(a.option_id);
    });

    qb.build().execute(pool).await?;
    Ok(())
}

pub async fn select_latest_quiz_attempt(
    pool: &PgPool,
    user_id: i64,
    post_id: i64,
) -> error::Result<Option<(i64, bool)>> {
    Ok(sqlx::query_as::<_, (i64, bool)>(
        r#"
        SELECT id, is_passed
        FROM post_quiz_attempts
        WHERE user_id = $1 AND post_id = $2
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        "#,
    )
    .bind(user_id)
    .bind(post_id)
    .fetch_optional(pool)
    .await?)
}

pub async fn select_quiz_answers_by_attempt_id(
    pool: &PgPool,
    attempt_id: i64,
) -> error::Result<Vec<QuizAnswer>> {
    Ok(sqlx::query_as::<_, QuizAnswer>(
        r#"
        SELECT question_id, option_id
        FROM post_quiz_answers
        WHERE attempt_id = $1
        ORDER BY question_id ASC
        "#,
    )
    .bind(attempt_id)
    .fetch_all(pool)
    .await?)
}
