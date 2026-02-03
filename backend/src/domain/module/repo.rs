use crate::domain::module::dto::{
    InsertModuleItemParams, InsertModuleParams, InsertModuleSectionParams, UpdateModuleItemParams,
    UpdateModuleParams, UpdateModuleSectionParams,
};
use crate::domain::module::model::{Module, ModuleItem, ModuleSection, PostWithSection};
use crate::domain::post::model::Post;
use crate::error;
use sqlx::{PgPool, Row};

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

pub async fn select_module_by_id(
    pool: &PgPool,
    id: i64,
    only_published: bool,
) -> error::Result<Option<Module>> {
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
        WHERE
          m.id = $1
          AND ($2::bool = false OR m.is_published = true)
        "#,
    )
    .bind(id)
    .bind(only_published)
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
pub async fn select_module_posts_with_section(
    pool: &PgPool,
    module_id: i64,
    only_published: bool,
) -> error::Result<Vec<(Option<i64>, Post)>> {
    let rows = sqlx::query_as::<_, PostWithSection>(
        r#"
        SELECT
          mi.section_id,
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
        LEFT JOIN module_sections ms
          ON ms.id = mi.section_id
        WHERE
          mi.module_id = $1
          AND ($2::bool = false OR p.is_published = true)
        ORDER BY
          ms.sort_order NULLS LAST,
          ms.id NULLS LAST,
          mi.sort_order ASC,
          mi.id ASC
        "#,
    )
    .bind(module_id)
    .bind(only_published)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| {
            (
                r.section_id,
                Post {
                    id: r.id,
                    title: r.title,
                    category_tag: r.category_tag,
                    content_markdown: r.content_markdown,
                    preview_text: r.preview_text,
                    author: r.author,
                    rating: r.rating,
                    is_published: r.is_published,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                },
            )
        })
        .collect())
}

pub async fn select_module_items(pool: &PgPool, module_id: i64) -> error::Result<Vec<ModuleItem>> {
    Ok(sqlx::query_as::<_, ModuleItem>(
        r#"
        SELECT
          id,
          module_id,
          post_id,
          section_id,
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
            section_id,
            sort_order
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id
        "#,
    )
    .bind(params.module_id)
    .bind(params.post_id)
    .bind(params.section_id)
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
        SET
            section_id = $1,
            sort_order = $2
        WHERE id = $3
        "#,
    )
    .bind(params.section_id)
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

//------------------------------------- Module Sections ----------------------------------------------

pub async fn select_module_sections(
    pool: &PgPool,
    module_id: i64,
) -> error::Result<Vec<ModuleSection>> {
    Ok(sqlx::query_as::<_, ModuleSection>(
        r#"
        SELECT
          id,
          module_id,
          title,
          description,
          sort_order,
          created_at
        FROM module_sections
        WHERE module_id = $1
        ORDER BY sort_order ASC, id ASC
        "#,
    )
    .bind(module_id)
    .fetch_all(pool)
    .await?)
}

pub async fn insert_module_section(
    pool: &PgPool,
    params: InsertModuleSectionParams,
) -> error::Result<i64> {
    Ok(sqlx::query_scalar::<_, i64>(
        r#"
        INSERT INTO module_sections (
            module_id,
            title,
            description,
            sort_order
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id
        "#,
    )
    .bind(params.module_id)
    .bind(params.title)
    .bind(params.description)
    .bind(params.sort_order)
    .fetch_one(pool)
    .await?)
}

pub async fn update_module_section_by_id(
    pool: &PgPool,
    id: i64,
    params: UpdateModuleSectionParams,
) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
        UPDATE module_sections
        SET
            title       = $1,
            description = $2,
            sort_order  = $3
        WHERE id = $4
        "#,
    )
    .bind(params.title)
    .bind(params.description)
    .bind(params.sort_order)
    .bind(id)
    .execute(pool)
    .await?
    .rows_affected())
}

pub async fn delete_module_section_by_id(pool: &PgPool, id: i64) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
        DELETE FROM module_sections
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
pub async fn list_module_ids_by_post_id(pool: &PgPool, post_id: i64) -> error::Result<Vec<i64>> {
    let rows = sqlx::query(
        r#"
        SELECT module_id
        FROM module_items
        WHERE post_id = $1
        ORDER BY module_id
        "#,
    )
    .bind(post_id)
    .fetch_all(pool)
    .await?;

    let ids = rows
        .into_iter()
        .map(|r| r.get::<i64, _>("module_id"))
        .collect();

    Ok(ids)
}

pub async fn list_post_ids_by_module_id(pool: &PgPool, module_id: i64) -> error::Result<Vec<i64>> {
    let rows = sqlx::query(
        r#"
        SELECT post_id
        FROM module_items
        WHERE module_id = $1
        ORDER BY sort_order NULLS LAST, id
        "#,
    )
    .bind(module_id)
    .fetch_all(pool)
    .await?;

    let ids = rows
        .into_iter()
        .map(|r| r.get::<i64, _>("post_id"))
        .collect();

    Ok(ids)
}

pub async fn list_post_titles_by_ids(
    pool: &PgPool,
    ids: &[i64],
) -> error::Result<Vec<(i64, String)>> {
    if ids.is_empty() {
        return Ok(vec![]);
    }

    let rows = sqlx::query(
        r#"
        SELECT id, title
        FROM posts
        WHERE id = ANY($1)
        "#,
    )
    .bind(ids)
    .fetch_all(pool)
    .await?;

    let out = rows
        .into_iter()
        .map(|r| (r.get::<i64, _>("id"), r.get::<String, _>("title")))
        .collect();

    Ok(out)
}
