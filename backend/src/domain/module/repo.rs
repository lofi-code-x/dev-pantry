use crate::domain::module::dto::{
    InsertModuleItemParams, InsertModuleParams, UpdateModuleItemParams, UpdateModuleParams,
};
use crate::domain::module::model::{Module, ModuleItem};
use crate::domain::post::model::Post;
use crate::error;
use sqlx::PgPool;

//---------------------------------------- Module ----------------------------------------------------

pub async fn select_module_list(pool: &PgPool, only_published: bool) -> error::Result<Vec<Module>> {
    Ok(sqlx::query_as::<_, Module>(
        r#"
        SELECT
          m.id,
          m.title,
          m.description,
          u.login AS author,
          m.rating,
          m.is_published,
          m.created_at,
          m.updated_at
        FROM modules m
        JOIN users u ON u.id = m.author_id
        WHERE ($1::bool = false OR m.is_published = true)
        ORDER BY m.updated_at DESC, m.id DESC
        "#,
    )
    .bind(only_published)
    .fetch_all(pool)
    .await?)
}

pub async fn select_module_by_id(pool: &PgPool, id: i64) -> error::Result<Option<Module>> {
    Ok(sqlx::query_as::<_, Module>(
        r#"
        SELECT
          m.id,
          m.title,
          m.description,
          u.login AS author,
          m.rating,
          m.is_published,
          m.created_at,
          m.updated_at
        FROM modules m
        JOIN users u ON u.id = m.author_id
        WHERE m.id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?)
}

pub async fn insert_module(pool: &PgPool, params: InsertModuleParams) -> error::Result<i64> {
    Ok(sqlx::query_scalar::<_, i64>(
        r#"
        INSERT INTO modules (
            title,
            description,
            author_id,
            is_published
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id
        "#,
    )
    .bind(params.title)
    .bind(params.description)
    .bind(params.author_id)
    .bind(params.is_published)
    .fetch_one(pool)
    .await?)
}

pub async fn update_module_by_id(
    pool: &PgPool,
    id: i64,
    params: UpdateModuleParams,
) -> error::Result<Option<i64>> {
    Ok(sqlx::query_scalar::<_, i64>(
        r#"
        UPDATE modules
        SET
            title       = $1,
            description = $2,
            updated_at  = NOW()
        WHERE id = $3
        RETURNING id
        "#,
    )
    .bind(params.title)
    .bind(params.description)
    .bind(id)
    .fetch_optional(pool)
    .await?)
}

pub async fn delete_module_by_id(pool: &PgPool, id: i64) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
        DELETE FROM modules
        WHERE id = $1
        "#,
    )
    .bind(id)
    .execute(pool)
    .await?
    .rows_affected())
}

//------------------------------------- Module Items ------------------------------------------------

pub async fn select_module_posts(
    pool: &PgPool,
    module_id: i64,
    only_published: bool,
) -> error::Result<Vec<Post>> {
    Ok(sqlx::query_as::<_, Post>(
        r#"
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
        FROM module_items mi
        JOIN posts p
          ON p.id = mi.post_id
        WHERE
          mi.module_id = $1
          AND ($2::bool = false OR p.is_published = true)
        ORDER BY
          mi.sort_order ASC,
          mi.id ASC
        "#,
    )
    .bind(module_id)
    .bind(only_published)
    .fetch_all(pool)
    .await?)
}

pub async fn select_module_items(pool: &PgPool, module_id: i64) -> error::Result<Vec<ModuleItem>> {
    Ok(sqlx::query_as::<_, ModuleItem>(
        r#"
        SELECT
          id,
          module_id,
          post_id,
          sort_order,
          created_at
        FROM module_items
        WHERE module_id = $1
        ORDER BY sort_order ASC, id ASC
        "#,
    )
        .bind(module_id)
        .fetch_all(pool)
        .await?)
}

pub async fn insert_module_item(
    pool: &PgPool,
    params: InsertModuleItemParams,
) -> error::Result<i64> {
    Ok(sqlx::query_scalar::<_, i64>(
        r#"
        INSERT INTO module_items (
            module_id,
            post_id,
            sort_order
        )
        VALUES ($1, $2, $3)
        RETURNING id
        "#,
    )
    .bind(params.module_id)
    .bind(params.post_id)
    .bind(params.sort_order)
    .fetch_one(pool)
    .await?)
}

pub async fn update_module_item_by_id(
    pool: &PgPool,
    id: i64,
    params: UpdateModuleItemParams,
) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
        UPDATE module_items
        SET sort_order = $1
        WHERE id = $2
        "#,
    )
    .bind(params.sort_order)
    .bind(id)
    .execute(pool)
    .await?
    .rows_affected())
}

pub async fn delete_module_item_by_id(pool: &PgPool, id: i64) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
        DELETE FROM module_items
        WHERE id = $1
        "#,
    )
    .bind(id)
    .execute(pool)
    .await?
    .rows_affected())
}

pub async fn set_public_module_by_id(
    pool: &PgPool,
    id: i64,
    is_public: bool,
) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
        UPDATE modules
        SET
            is_published = $1,
            updated_at   = NOW()
        WHERE id = $2
        "#,
    )
    .bind(is_public)
    .bind(id)
    .execute(pool)
    .await?
    .rows_affected())
}
