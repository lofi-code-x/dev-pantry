use sqlx::PgPool;

use crate::domain::me::model::{
    BookmarkedPost, ModuleProgress, PostState, ProgressPost, UserContacts,
};
use crate::error;

// ------------------------------ Bookmarks ------------------------------

pub async fn add_bookmark(pool: &PgPool, user_id: i64, post_id: i64) -> error::Result<()> {
    sqlx::query(
        r#"
        INSERT INTO post_bookmarks (user_id, post_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, post_id) DO NOTHING
        "#,
    )
    .bind(user_id)
    .bind(post_id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn remove_bookmark(pool: &PgPool, user_id: i64, post_id: i64) -> error::Result<u64> {
    let res = sqlx::query(
        r#"
        DELETE FROM post_bookmarks
        WHERE user_id = $1 AND post_id = $2
        "#,
    )
    .bind(user_id)
    .bind(post_id)
    .execute(pool)
    .await?;

    Ok(res.rows_affected())
}

/// Список закладок пользователя (можно фильтровать только опубликованные посты)
pub async fn list_bookmarks(
    pool: &PgPool,
    user_id: i64,
    only_published: bool,
) -> error::Result<Vec<BookmarkedPost>> {
    Ok(sqlx::query_as::<_, BookmarkedPost>(
        r#"
        SELECT
          p.id AS post_id,
          p.title,
          p.preview_text,
          p.category_tag,
          p.author,
          p.updated_at,
          b.created_at AS bookmarked_at
        FROM post_bookmarks b
        JOIN posts p ON p.id = b.post_id
        WHERE
          b.user_id = $1
          AND ($2::bool = false OR p.is_published = true)
        ORDER BY
          b.created_at DESC, p.id DESC
        "#,
    )
    .bind(user_id)
    .bind(only_published)
    .fetch_all(pool)
    .await?)
}

// ------------------------------ Progress ------------------------------
/// Отметить пост завершённым (UPSERT)
pub async fn mark_completed(pool: &PgPool, user_id: i64, post_id: i64) -> error::Result<()> {
    sqlx::query(
        r#"
        INSERT INTO post_progress (user_id, post_id, is_completed, completed_at, last_read_at)
        VALUES ($1, $2, true, NOW(), NOW())
        ON CONFLICT (user_id, post_id)
        DO UPDATE SET
          is_completed = true,
          completed_at = NOW(),
          last_read_at = NOW()
        "#,
    )
    .bind(user_id)
    .bind(post_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// Снять completion (если понадобится)
pub async fn uncomplete(pool: &PgPool, user_id: i64, post_id: i64) -> error::Result<u64> {
    let res = sqlx::query(
        r#"
        UPDATE post_progress
        SET
          is_completed = false,
          completed_at = NULL,
          last_read_at = NOW()
        WHERE user_id = $1 AND post_id = $2
        "#,
    )
    .bind(user_id)
    .bind(post_id)
    .execute(pool)
    .await?;

    Ok(res.rows_affected())
}

/// Список прогресса (можно показывать "прочитанные/в процессе" и "completed")
pub async fn list_progress(
    pool: &PgPool,
    user_id: i64,
    only_published: bool,
    only_completed: Option<bool>,
) -> error::Result<Vec<ProgressPost>> {
    Ok(sqlx::query_as::<_, ProgressPost>(
        r#"
        SELECT
          p.id AS post_id,
          p.title,
          p.preview_text,
          p.category_tag,
          p.author,
          p.updated_at,
          pr.is_completed,
          pr.completed_at,
          pr.last_read_at
        FROM post_progress pr
        JOIN posts p ON p.id = pr.post_id
        WHERE
          pr.user_id = $1
          AND ($2::bool = false OR p.is_published = true)
          AND ($3::bool IS NULL OR pr.is_completed = $3::bool)
        ORDER BY
          pr.last_read_at DESC, p.id DESC
        "#,
    )
    .bind(user_id)
    .bind(only_published)
    .bind(only_completed)
    .fetch_all(pool)
    .await?)
}

pub async fn select_post_state(
    pool: &PgPool,
    user_id: i64,
    post_id: i64,
) -> error::Result<PostState> {
    Ok(sqlx::query_as::<_, PostState>(
        r#"
        SELECT
          EXISTS(
            SELECT 1
            FROM post_bookmarks b
            WHERE b.user_id = $1 AND b.post_id = $2
          ) AS saved,
          COALESCE(
            (
              SELECT p.is_completed
              FROM post_progress p
              WHERE p.user_id = $1 AND p.post_id = $2
              LIMIT 1
            ),
            false
          ) AS completed
        "#,
    )
    .bind(user_id)
    .bind(post_id)
    .fetch_one(pool)
    .await?)
}

pub async fn list_module_progress(
    pool: &PgPool,
    user_id: i64,
) -> error::Result<Vec<ModuleProgress>> {
    Ok(sqlx::query_as::<_, ModuleProgress>(
        r#"
        SELECT
          mi.module_id                                   AS module_id,
          COUNT(*)::bigint                               AS total_posts,
          COUNT(*) FILTER (WHERE pp.is_completed = true)::bigint AS completed_posts,
          (
            COUNT(*) > 0
            AND COUNT(*) FILTER (WHERE pp.is_completed = true) = COUNT(*)
          )                                              AS is_completed
        FROM module_items mi
        LEFT JOIN post_progress pp
          ON pp.user_id = $1
         AND pp.post_id = mi.post_id
        GROUP BY mi.module_id
        ORDER BY mi.module_id ASC
        "#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?)
}

// ------------------------------ Contacts ------------------------------

pub async fn get_contacts(pool: &PgPool, user_id: i64) -> error::Result<Option<UserContacts>> {
    Ok(sqlx::query_as::<_, UserContacts>(
        r#"
        SELECT user_id, email, website, github, telegram, updated_at
        FROM user_contacts
        WHERE user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?)
}

pub async fn upsert_contacts(
    pool: &PgPool,
    user_id: i64,
    email: Option<String>,
    website: Option<String>,
    github: Option<String>,
    telegram: Option<String>,
) -> error::Result<UserContacts> {
    Ok(sqlx::query_as::<_, UserContacts>(
        r#"
        INSERT INTO user_contacts (user_id, email, website, github, telegram)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id) DO UPDATE SET
            email = EXCLUDED.email,
            website = EXCLUDED.website,
            github = EXCLUDED.github,
            telegram = EXCLUDED.telegram,
            updated_at = NOW()
        RETURNING user_id, email, website, github, telegram, updated_at
        "#,
    )
    .bind(user_id)
    .bind(email)
    .bind(website)
    .bind(github)
    .bind(telegram)
    .fetch_one(pool)
    .await?)
}
