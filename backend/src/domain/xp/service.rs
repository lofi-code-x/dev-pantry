use chrono::{Datelike, NaiveDate, Utc};
use sqlx::PgPool;

use crate::domain::xp::model::UserStats;
use crate::domain::xp::repo;
use crate::error;

pub const KIND_POST_COMPLETED: &str = "post_completed";
pub const KIND_MODULE_COMPLETED: &str = "module_completed";
pub const KIND_QUIZ_PASSED: &str = "quiz_passed";
pub const KIND_STREAK_DAILY: &str = "streak_daily";

pub async fn add_event(
    pool: &PgPool,
    user_id: i64,
    kind: &str,
    ref_type: &str,
    ref_id: i64,
    delta: i32,
) -> error::Result<bool> {
    let mut tx = pool.begin().await?;

    let inserted = repo::insert_event_tx(&mut tx, user_id, kind, ref_type, ref_id, delta).await?;
    if inserted.is_none() {
        tx.commit().await?;
        return Ok(false);
    }

    repo::ensure_user_stats_tx(&mut tx, user_id).await?;

    let (post_inc, module_inc) = match kind {
        KIND_POST_COMPLETED => (1, 0),
        KIND_MODULE_COMPLETED => (0, 1),
        _ => (0, 0),
    };

    repo::update_user_stats_tx(&mut tx, user_id, delta, post_inc, module_inc).await?;

    tx.commit().await?;
    Ok(true)
}

pub async fn award_post_completed(pool: &PgPool, user_id: i64, post_id: i64) -> error::Result<bool> {
    add_event(pool, user_id, KIND_POST_COMPLETED, "post", post_id, 1).await
}

pub async fn award_module_completed(
    pool: &PgPool,
    user_id: i64,
    module_id: i64,
) -> error::Result<bool> {
    add_event(pool, user_id, KIND_MODULE_COMPLETED, "module", module_id, 2).await
}

pub async fn award_quiz_passed(
    pool: &PgPool,
    user_id: i64,
    post_id: i64,
    delta: i32,
) -> error::Result<bool> {
    add_event(pool, user_id, KIND_QUIZ_PASSED, "post", post_id, delta).await
}

pub async fn award_streak_daily(pool: &PgPool, user_id: i64, date: NaiveDate) -> error::Result<bool> {
    let ref_id = (date.year() as i64) * 10000 + (date.month() as i64) * 100 + (date.day() as i64);
    add_event(pool, user_id, KIND_STREAK_DAILY, "day", ref_id, 1).await
}

pub fn quiz_delta(total_questions: i32, correct_answers: i32) -> i32 {
    if total_questions <= 0 {
        return 0;
    }

    let ratio = correct_answers as f64 / total_questions as f64;
    if ratio >= 0.9 {
        3
    } else if ratio >= 0.7 {
        2
    } else {
        1
    }
}

pub fn today_utc_date() -> NaiveDate {
    Utc::now().date_naive()
}

pub async fn get_user_stats(pool: &PgPool, user_id: i64) -> error::Result<UserStats> {
    let mut tx = pool.begin().await?;
    repo::ensure_user_stats_tx(&mut tx, user_id).await?;
    let stats = repo::select_user_stats_tx(&mut tx, user_id).await?;
    tx.commit().await?;
    Ok(stats)
}

pub async fn list_leaderboard(pool: &PgPool, limit: i64) -> error::Result<Vec<crate::domain::xp::model::LeaderboardUser>> {
    let mut tx = pool.begin().await?;
    let rows = repo::list_leaderboard(&mut tx, limit).await?;
    tx.commit().await?;

    Ok(rows
        .into_iter()
        .map(|r| crate::domain::xp::model::LeaderboardUser {
            login: r.login,
            avatar_url: r.avatar_key.map(|k| format!("/uploads/{}", k)),
            total_xp: r.total_xp,
        })
        .collect())
}
