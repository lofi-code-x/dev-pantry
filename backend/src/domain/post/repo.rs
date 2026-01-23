use crate::domain::post::dto::{InsertParams, SearchParams, UpdateParams};
use crate::domain::post::model::Post;
use crate::error;
use sqlx::PgPool;

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
