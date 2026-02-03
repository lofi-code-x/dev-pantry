use sqlx::PgPool;

use crate::domain::me::model::ProgressPost;
use crate::domain::me::repo;
use crate::domain::module;
use crate::domain::xp;
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
    repo::mark_completed(pool, user_id, post_id).await?;

    let inserted = xp::service::award_post_completed(pool, user_id, post_id).await?;
    if inserted {
        xp::service::award_streak_daily(pool, user_id, xp::service::today_utc_date()).await?;

        let module_ids = module::repo::list_module_ids_by_post_id(pool, post_id).await?;
        for module_id in module_ids {
            if module::repo::is_module_completed_for_user(pool, user_id, module_id).await? {
                xp::service::award_module_completed(pool, user_id, module_id).await?;
            }
        }
    }

    Ok(())
}

pub async fn uncomplete(pool: &PgPool, user_id: i64, post_id: i64) -> error::Result<()> {
    let rows = repo::uncomplete(pool, user_id, post_id).await?;
    if rows == 0 {
        return Err(error::Error::NotFound("Progress not found.".to_string()));
    }
    Ok(())
}
