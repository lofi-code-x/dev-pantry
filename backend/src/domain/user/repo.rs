use crate::domain::user::model::{PublicUserProfileRow, User, UserRole};
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

pub async fn select_public_profile_by_login(
    pool: &PgPool,
    login: &str,
) -> error::Result<Option<PublicUserProfileRow>> {
    Ok(sqlx::query_as::<_, PublicUserProfileRow>(
        r#"
        SELECT
            u.login,
            u.role,
            up.key AS avatar_key,
            uc.email,
            uc.website,
            uc.github,
            uc.telegram,
            COALESCE(us.total_xp, 0) AS total_xp,
            COALESCE(us.posts_completed, 0) AS posts_completed,
            COALESCE(us.modules_completed, 0) AS modules_completed
        FROM users u
        LEFT JOIN user_contacts uc ON uc.user_id = u.id
        LEFT JOIN user_stats us ON us.user_id = u.id
        LEFT JOIN uploads up ON up.id = u.avatar_upload_id
        WHERE u.login = $1
        "#,
    )
    .bind(login)
    .fetch_optional(pool)
    .await?)
}
