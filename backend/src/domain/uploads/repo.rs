use crate::domain::uploads::dto::{
    AttachModuleImagesParams, AttachPostImagesParams, InsertUploadParams, SetUserAvatarParams,
};
use crate::domain::uploads::model::Upload;
use crate::error;
use sqlx::{PgPool, Row};
use uuid::Uuid;

// ---------------------------------------- Uploads -------------------------------------------------

pub async fn insert_upload(pool: &PgPool, params: InsertUploadParams) -> error::Result<Upload> {
    Ok(sqlx::query_as::<_, Upload>(
        r#"
        INSERT INTO uploads (
            id,
            key,
            content_type,
            size_bytes,
            created_by
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
            id,
            key,
            content_type,
            size_bytes,
            created_by,
            created_at
        "#,
    )
    .bind(params.id)
    .bind(params.key)
    .bind(params.content_type)
    .bind(params.size_bytes)
    .bind(params.created_by)
    .fetch_one(pool)
    .await?)
}

pub async fn select_upload_keys_by_ids(
    pool: &PgPool,
    ids: &[Uuid],
) -> error::Result<Vec<(Uuid, String)>> {
    if ids.is_empty() {
        return Ok(vec![]);
    }

    let rows = sqlx::query(
        r#"
        SELECT id, key
        FROM uploads
        WHERE id = ANY($1::uuid[])
        "#,
    )
    .bind(ids)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| (r.get::<Uuid, _>("id"), r.get::<String, _>("key")))
        .collect())
}

pub async fn delete_uploads_by_ids(pool: &PgPool, ids: &[Uuid]) -> error::Result<u64> {
    if ids.is_empty() {
        return Ok(0);
    }

    Ok(sqlx::query(
        r#"
        DELETE FROM uploads
        WHERE id = ANY($1::uuid[])
        "#,
    )
    .bind(ids)
    .execute(pool)
    .await?
    .rows_affected())
}

/// Bulk: из переданного списка вернёт те upload_id, которые ещё где-то используются.
pub async fn list_in_use_upload_ids(pool: &PgPool, ids: &[Uuid]) -> error::Result<Vec<Uuid>> {
    if ids.is_empty() {
        return Ok(vec![]);
    }

    let rows = sqlx::query(
        r#"
        SELECT DISTINCT x AS upload_id
        FROM UNNEST($1::uuid[]) AS x
        WHERE
            EXISTS (SELECT 1 FROM post_images    pi WHERE pi.upload_id = x)
         OR EXISTS (SELECT 1 FROM module_images mi WHERE mi.upload_id = x)
         OR EXISTS (SELECT 1 FROM users         u  WHERE u.avatar_upload_id = x)
        "#,
    )
    .bind(ids)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| r.get::<Uuid, _>("upload_id"))
        .collect())
}

// ------------------------------------- Post Images -------------------------------------------------

pub async fn attach_post_images(
    pool: &PgPool,
    params: AttachPostImagesParams,
) -> error::Result<u64> {
    if params.upload_ids.is_empty() {
        return Ok(0);
    }

    Ok(sqlx::query(
        r#"
        INSERT INTO post_images (post_id, upload_id)
        SELECT $1, x
        FROM UNNEST($2::uuid[]) AS x
        ON CONFLICT DO NOTHING
        "#,
    )
    .bind(params.post_id)
    .bind(params.upload_ids)
    .execute(pool)
    .await?
    .rows_affected())
}

pub async fn list_post_image_ids(pool: &PgPool, post_id: i64) -> error::Result<Vec<Uuid>> {
    let rows = sqlx::query(
        r#"
        SELECT upload_id
        FROM post_images
        WHERE post_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(post_id)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| r.get::<Uuid, _>("upload_id"))
        .collect())
}

pub async fn list_post_images(pool: &PgPool, post_id: i64) -> error::Result<Vec<Upload>> {
    Ok(sqlx::query_as::<_, Upload>(
        r#"
        SELECT
            u.id,
            u.key,
            u.content_type,
            u.size_bytes,
            u.created_by,
            u.created_at
        FROM post_images pi
        JOIN uploads u ON u.id = pi.upload_id
        WHERE pi.post_id = $1
        ORDER BY pi.created_at DESC
        "#,
    )
    .bind(post_id)
    .fetch_all(pool)
    .await?)
}

pub async fn detach_post_images(
    pool: &PgPool,
    post_id: i64,
    upload_ids: &[Uuid],
) -> error::Result<u64> {
    if upload_ids.is_empty() {
        return Ok(0);
    }

    Ok(sqlx::query(
        r#"
        DELETE FROM post_images
        WHERE post_id = $1
          AND upload_id = ANY($2::uuid[])
        "#,
    )
    .bind(post_id)
    .bind(upload_ids)
    .execute(pool)
    .await?
    .rows_affected())
}

// ------------------------------------ Module Images ------------------------------------------------

pub async fn attach_module_images(
    pool: &PgPool,
    params: AttachModuleImagesParams,
) -> error::Result<u64> {
    if params.upload_ids.is_empty() {
        return Ok(0);
    }

    Ok(sqlx::query(
        r#"
        INSERT INTO module_images (module_id, upload_id)
        SELECT $1, x
        FROM UNNEST($2::uuid[]) AS x
        ON CONFLICT DO NOTHING
        "#,
    )
    .bind(params.module_id)
    .bind(params.upload_ids)
    .execute(pool)
    .await?
    .rows_affected())
}

pub async fn list_module_image_ids(pool: &PgPool, module_id: i64) -> error::Result<Vec<Uuid>> {
    let rows = sqlx::query(
        r#"
        SELECT upload_id
        FROM module_images
        WHERE module_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(module_id)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| r.get::<Uuid, _>("upload_id"))
        .collect())
}

pub async fn list_module_images(pool: &PgPool, module_id: i64) -> error::Result<Vec<Upload>> {
    Ok(sqlx::query_as::<_, Upload>(
        r#"
        SELECT
            u.id,
            u.key,
            u.content_type,
            u.size_bytes,
            u.created_by,
            u.created_at
        FROM module_images mi
        JOIN uploads u ON u.id = mi.upload_id
        WHERE mi.module_id = $1
        ORDER BY mi.created_at DESC
        "#,
    )
    .bind(module_id)
    .fetch_all(pool)
    .await?)
}

pub async fn detach_module_images(
    pool: &PgPool,
    module_id: i64,
    upload_ids: &[Uuid],
) -> error::Result<u64> {
    if upload_ids.is_empty() {
        return Ok(0);
    }

    Ok(sqlx::query(
        r#"
        DELETE FROM module_images
        WHERE module_id = $1
          AND upload_id = ANY($2::uuid[])
        "#,
    )
    .bind(module_id)
    .bind(upload_ids)
    .execute(pool)
    .await?
    .rows_affected())
}

// --------------------------------------- User Avatar ------------------------------------------------

pub async fn set_user_avatar(pool: &PgPool, params: SetUserAvatarParams) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
        UPDATE users
        SET avatar_upload_id = $1
        WHERE id = $2
        "#,
    )
    .bind(params.upload_id)
    .bind(params.user_id)
    .execute(pool)
    .await?
    .rows_affected())
}

pub async fn clear_user_avatar(pool: &PgPool, user_id: i64) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
        UPDATE users
        SET avatar_upload_id = NULL
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .execute(pool)
    .await?
    .rows_affected())
}

pub async fn get_user_avatar(pool: &PgPool, user_id: i64) -> error::Result<Option<Upload>> {
    Ok(sqlx::query_as::<_, Upload>(
        r#"
        SELECT
            u.id,
            u.key,
            u.content_type,
            u.size_bytes,
            u.created_by,
            u.created_at
        FROM users us
        JOIN uploads u ON u.id = us.avatar_upload_id
        WHERE us.id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?)
}

/// Для списка module_id вернёт по одной (последней) картинке на модуль:
/// (module_id, upload_id, key)
pub async fn select_module_cover_uploads_by_module_ids(
    pool: &PgPool,
    module_ids: &[i64],
) -> error::Result<Vec<(i64, Uuid, String)>> {
    if module_ids.is_empty() {
        return Ok(vec![]);
    }

    let rows = sqlx::query(
        r#"
        SELECT DISTINCT ON (mi.module_id)
            mi.module_id,
            u.id  AS upload_id,
            u.key AS key
        FROM module_images mi
        JOIN uploads u ON u.id = mi.upload_id
        WHERE mi.module_id = ANY($1::bigint[])
        ORDER BY mi.module_id, mi.created_at DESC
        "#,
    )
    .bind(module_ids)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| {
            (
                r.get::<i64, _>("module_id"),
                r.get::<Uuid, _>("upload_id"),
                r.get::<String, _>("key"),
            )
        })
        .collect())
}
