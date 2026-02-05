use crate::domain::analytics::model::DailyStats;
use crate::domain::analytics::repo;
use crate::error;
use sqlx::PgPool;
use uuid::Uuid;

pub async fn log_pageview(
    pool: &PgPool,
    visitor_id: Uuid,
    user_id: Option<i64>,
    path: &str,
    user_agent: Option<&str>,
) -> error::Result<()> {
    repo::insert_pageview(pool, visitor_id, user_id, path, user_agent).await
}

pub async fn get_daily_stats(pool: &PgPool, days: i64) -> error::Result<Vec<DailyStats>> {
    repo::list_daily_stats(pool, days).await
}
