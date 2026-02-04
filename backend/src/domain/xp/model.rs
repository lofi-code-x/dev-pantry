use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;

#[derive(Serialize, FromRow)]
pub struct UserStats {
    pub user_id: i64,
    pub total_xp: i32,
    pub posts_completed: i64,
    pub modules_completed: i64,
    pub updated_at: DateTime<Utc>,
}

#[derive(Serialize, FromRow)]
pub struct LeaderboardUser {
    pub login: String,
    pub avatar_url: Option<String>,
    pub total_xp: i32,
}

#[derive(FromRow)]
pub struct LeaderboardRow {
    pub login: String,
    pub avatar_key: Option<String>,
    pub total_xp: i32,
}
