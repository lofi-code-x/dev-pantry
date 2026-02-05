use crate::domain::user::model::{User, UserRole};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct LoginRequest {
    pub login: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct PublicUser {
    pub id: i64,
    pub login: String,
    pub role: UserRole,
}

impl From<User> for PublicUser {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            login: user.login,
            role: user.role,
        }
    }
}

#[derive(Serialize)]
pub struct PublicUserContacts {
    pub email: Option<String>,
    pub website: Option<String>,
    pub github: Option<String>,
    pub telegram: Option<String>,
}

#[derive(Serialize)]
pub struct PublicUserStats {
    pub total_xp: i32,
    pub posts_completed: i64,
    pub modules_completed: i64,
}

#[derive(Serialize)]
pub struct PublicUserProfile {
    pub login: String,
    pub role: UserRole,
    pub avatar_url: Option<String>,
    pub contacts: PublicUserContacts,
    pub stats: PublicUserStats,
}

#[derive(Serialize)]
pub struct AdminUserListItem {
    pub id: i64,
    pub login: String,
    pub role: UserRole,
    pub created_at: DateTime<Utc>,
    pub avatar_url: Option<String>,
}

#[derive(Serialize)]
pub struct AdminUserListResponse {
    pub items: Vec<AdminUserListItem>,
    pub page: i64,
    pub limit: i64,
    pub total: i64,
}

#[derive(Deserialize)]
pub struct UpdateUserRoleRequest {
    pub role: UserRole,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: PublicUser,
}

#[derive(serde::Deserialize)]
pub struct AdminUsersQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub q: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct AdminStatsQuery {
    pub days: Option<i64>,
}
