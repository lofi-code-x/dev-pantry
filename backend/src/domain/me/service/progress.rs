use sqlx::PgPool;

use crate::domain::me::model::ProgressPost;
use crate::domain::me::repo;
use crate::error;

pub async fn list(
    pool: &PgPool,
    user_id: i64,
    only_published: bool,
    only_completed: Option<bool>,
) -> error::Result<Vec<ProgressPost>> {
    repo::list_progress(pool, user_id, only_published, only_completed).await
}

pub async fn mark_completed(pool: &PgPool, user_id: i64, post_id: i64) -> error::Result<()> {
    repo::mark_completed(pool, user_id, post_id).await
}

pub async fn uncomplete(pool: &PgPool, user_id: i64, post_id: i64) -> error::Result<()> {
    let rows = repo::uncomplete(pool, user_id, post_id).await?;
    if rows == 0 {
        return Err(error::Error::NotFound("Progress not found.".to_string()));
    }
    Ok(())
}
