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
pub struct AuthResponse {
    pub token: String,
    pub user: PublicUser,
}
