use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, FromRow)]
pub struct User {
    pub id: i64,
    pub login: String,
    pub password_hash: String,
    pub role: UserRole,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "user_role", rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    Moderator,
    Editor,
    User,
}

#[derive(sqlx::FromRow)]
pub struct PublicUserProfileRow {
    pub login: String,
    pub role: UserRole,
    pub avatar_key: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub github: Option<String>,
    pub telegram: Option<String>,
    pub total_xp: i32,
    pub posts_completed: i64,
    pub modules_completed: i64,
}

#[derive(sqlx::FromRow)]
pub struct AdminUserRow {
    pub id: i64,
    pub login: String,
    pub role: UserRole,
    pub created_at: DateTime<Utc>,
    pub avatar_key: Option<String>,
}
