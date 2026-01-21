use crate::domain::user::model::{User, UserRole};
use crate::error;
use sqlx::PgPool;

pub async fn insert(
    pool: &PgPool,
    login: &str,
    password: &str,
    role: UserRole,
) -> error::Result<User> {
    Ok(sqlx::query_as::<_, User>(
        r#"
            INSERT INTO users (login, password_hash, role)
            VALUES ($1, $2, $3)
            RETURNING *
            "#,
    )
    .bind(login)
    .bind(password)
    .bind(role)
    .fetch_one(pool)
    .await?)
}

pub async fn select_by_login(pool: &PgPool, login: &str) -> error::Result<User> {
    Ok(
        sqlx::query_as::<_, User>("SELECT * FROM users WHERE login = $1")
            .bind(login)
            .fetch_one(pool)
            .await?,
    )
}

pub async fn select_by_id(pool: &PgPool, id: i64) -> error::Result<User> {
    Ok(
        sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
            .bind(id)
            .fetch_one(pool)
            .await?,
    )
}