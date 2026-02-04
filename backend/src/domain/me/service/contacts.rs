use sqlx::PgPool;

use crate::domain::me::model::UserContacts;
use crate::domain::me::repo;
use crate::error;

pub async fn get(pool: &PgPool, user_id: i64) -> error::Result<UserContacts> {
    Ok(repo::get_contacts(pool, user_id)
        .await?
        .unwrap_or(UserContacts {
            user_id,
            email: None,
            website: None,
            github: None,
            telegram: None,
            updated_at: chrono::Utc::now(),
        }))
}

fn clean(value: Option<String>) -> Option<String> {
    value
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

pub async fn upsert(
    pool: &PgPool,
    user_id: i64,
    email: Option<String>,
    website: Option<String>,
    github: Option<String>,
    telegram: Option<String>,
) -> error::Result<UserContacts> {
    repo::upsert_contacts(
        pool,
        user_id,
        clean(email),
        clean(website),
        clean(github),
        clean(telegram),
    )
    .await
}
