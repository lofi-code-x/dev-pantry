use crate::domain::user::model::{User, UserRole};
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
pub struct AuthResponse {
    pub token: String,
    pub user: PublicUser,
}
