use crate::domain::analytics::model::DailyStats;
use crate::error;
use sqlx::PgPool;
use uuid::Uuid;

pub async fn insert_pageview(
    pool: &PgPool,
    visitor_id: Uuid,
    user_id: Option<i64>,
    path: &str,
    user_agent: Option<&str>,
) -> error::Result<()> {
    sqlx::query(
        r#"
        INSERT INTO analytics_events (visitor_id, user_id, path, user_agent)
        VALUES ($1, $2, $3, $4)
        "#,
    )
    .bind(visitor_id)
    .bind(user_id)
    .bind(path)
    .bind(user_agent)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn list_daily_stats(pool: &PgPool, days: i64) -> error::Result<Vec<DailyStats>> {
    Ok(sqlx::query_as::<_, DailyStats>(
        r#"
        SELECT
            DATE(created_at) AS day,
            COUNT(*) AS pageviews,
            COUNT(*) FILTER (WHERE user_id IS NOT NULL) AS pageviews_auth,
            COUNT(*) FILTER (WHERE user_id IS NULL) AS pageviews_anon,
            COUNT(DISTINCT visitor_id) AS unique_visitors,
            COUNT(DISTINCT user_id) AS unique_auth,
            COUNT(DISTINCT visitor_id) FILTER (WHERE user_id IS NULL) AS unique_anon
        FROM analytics_events
        WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
        GROUP BY day
        ORDER BY day DESC
        "#,
    )
    .bind(days as i32)
    .fetch_all(pool)
    .await?)
}
