use crate::domain::user::model::{AdminUserRow, PublicUserProfileRow, User, UserRole};
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

pub async fn count_users(pool: &PgPool) -> error::Result<i64> {
    Ok(sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users")
        .fetch_one(pool)
        .await?)
}

pub async fn count_users_filtered(pool: &PgPool, q: &str) -> error::Result<i64> {
    Ok(sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM users u
        WHERE u.login ILIKE $1
        "#,
    )
    .bind(format!("%{}%", q))
    .fetch_one(pool)
    .await?)
}

pub async fn list_users_page(
    pool: &PgPool,
    limit: i64,
    offset: i64,
) -> error::Result<Vec<AdminUserRow>> {
    Ok(sqlx::query_as::<_, AdminUserRow>(
        r#"
        SELECT
            u.id,
            u.login,
            u.role,
            u.created_at,
            up.key AS avatar_key
        FROM users u
        LEFT JOIN uploads up ON up.id = u.avatar_upload_id
        ORDER BY u.created_at DESC, u.id DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?)
}

pub async fn list_users_page_filtered(
    pool: &PgPool,
    q: &str,
    limit: i64,
    offset: i64,
) -> error::Result<Vec<AdminUserRow>> {
    Ok(sqlx::query_as::<_, AdminUserRow>(
        r#"
        SELECT
            u.id,
            u.login,
            u.role,
            u.created_at,
            up.key AS avatar_key
        FROM users u
        LEFT JOIN uploads up ON up.id = u.avatar_upload_id
        WHERE u.login ILIKE $1
        ORDER BY u.created_at DESC, u.id DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(format!("%{}%", q))
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?)
}

pub async fn update_user_role(
    pool: &PgPool,
    user_id: i64,
    role: UserRole,
) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
        UPDATE users
        SET role = $1
        WHERE id = $2
        "#,
    )
    .bind(role)
    .bind(user_id)
    .execute(pool)
    .await?
    .rows_affected())
}

pub async fn delete_user(pool: &PgPool, user_id: i64) -> error::Result<u64> {
    Ok(sqlx::query(
        r#"
        DELETE FROM users
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .execute(pool)
    .await?
    .rows_affected())
}
