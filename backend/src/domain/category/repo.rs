use crate::domain::category::model::Category;
use crate::error;
use sqlx::PgPool;

pub async fn insert(pool: &PgPool, tag: &str, title: &str) -> error::Result<Category> {
    Ok(sqlx::query_as::<_, Category>(
        "INSERT INTO categories (tag, title)
             VALUES ($1, $2)
             RETURNING tag, title",
    )
    .bind(tag)
    .bind(title)
    .fetch_one(pool)
    .await?)
}

pub async fn select_all(pool: &PgPool) -> error::Result<Vec<Category>> {
    Ok(
        sqlx::query_as::<_, Category>("SELECT tag, title FROM categories ORDER BY tag")
            .fetch_all(pool)
            .await?,
    )
}

pub async fn delete(pool: &PgPool, tag: &str) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
            DELETE FROM categories
            WHERE tag = $1
            "#,
    )
    .bind(tag)
    .execute(pool)
    .await?
    .rows_affected())
}
