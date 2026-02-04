use sqlx::{Postgres, Transaction};

use crate::domain::xp::model::{LeaderboardRow, UserStats};
use crate::error;

pub async fn insert_event_tx(
    tx: &mut Transaction<'_, Postgres>,
    user_id: i64,
    kind: &str,
    ref_type: &str,
    ref_id: i64,
    delta: i32,
) -> error::Result<Option<i64>> {
    let res = sqlx::query_scalar::<_, i64>(
        r#"
        INSERT INTO user_xp_events (user_id, kind, ref_type, ref_id, delta)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, kind, ref_type, ref_id) DO NOTHING
        RETURNING id
        "#,
    )
    .bind(user_id)
    .bind(kind)
    .bind(ref_type)
    .bind(ref_id)
    .bind(delta)
    .fetch_optional(&mut **tx)
    .await?;

    Ok(res)
}

pub async fn ensure_user_stats_tx(
    tx: &mut Transaction<'_, Postgres>,
    user_id: i64,
) -> error::Result<()> {
    sqlx::query(
        r#"
        INSERT INTO user_stats (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
        "#,
    )
    .bind(user_id)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

pub async fn update_user_stats_tx(
    tx: &mut Transaction<'_, Postgres>,
    user_id: i64,
    delta_xp: i32,
    posts_inc: i64,
    modules_inc: i64,
) -> error::Result<()> {
    sqlx::query(
        r#"
        UPDATE user_stats
        SET
            total_xp = total_xp + $2,
            posts_completed = posts_completed + $3,
            modules_completed = modules_completed + $4,
            updated_at = NOW()
        WHERE user_id = $1
        "#,
    )
    .bind(user_id)
    .bind(delta_xp)
    .bind(posts_inc)
    .bind(modules_inc)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

pub async fn select_user_stats_tx(
    tx: &mut Transaction<'_, Postgres>,
    user_id: i64,
) -> error::Result<UserStats> {
    Ok(sqlx::query_as::<_, UserStats>(
        r#"
        SELECT user_id, total_xp, posts_completed, modules_completed, updated_at
        FROM user_stats
        WHERE user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_one(&mut **tx)
    .await?)
}

pub async fn list_leaderboard(
    tx: &mut Transaction<'_, Postgres>,
    limit: i64,
) -> error::Result<Vec<LeaderboardRow>> {
    Ok(sqlx::query_as::<_, LeaderboardRow>(
        r#"
        SELECT
            u.login,
            up.key AS avatar_key,
            us.total_xp
        FROM user_stats us
        JOIN users u ON u.id = us.user_id
        LEFT JOIN uploads up ON up.id = u.avatar_upload_id
        ORDER BY us.total_xp DESC, u.login ASC
        LIMIT $1
        "#,
    )
    .bind(limit)
    .fetch_all(&mut **tx)
    .await?)
}
