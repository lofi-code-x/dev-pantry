use sqlx::PgPool;

use crate::domain::me::model::BookmarkedPost;
use crate::domain::me::repo;
use crate::error;

pub async fn list(
    pool: &PgPool,
    user_id: i64,
    only_published: bool,
) -> error::Result<Vec<BookmarkedPost>> {
    repo::list_bookmarks(pool, user_id, only_published).await
}

pub async fn add(pool: &PgPool, user_id: i64, post_id: i64) -> error::Result<()> {
    repo::add_bookmark(pool, user_id, post_id).await
}

pub async fn remove(pool: &PgPool, user_id: i64, post_id: i64) -> error::Result<()> {
    let rows = repo::remove_bookmark(pool, user_id, post_id).await?;
    if rows == 0 {
        return Err(error::Error::NotFound("Bookmark not found.".to_string()));
    }
    Ok(())
}
