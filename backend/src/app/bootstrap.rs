use crate::{config::Config, error};
use argon2::password_hash::{SaltString, rand_core::OsRng};
use argon2::{Argon2, Params, PasswordHasher, Version};
use sqlx::PgPool;

fn hash_password(password: &str) -> error::Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    let params = Params::new(19 * 1024, 2, 1, None)
        .map_err(|e| error::Error::Config(format!("argon2 params: {e}")))?;
    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, Version::V0x13, params);

    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| error::Error::Config(format!("argon2 hash: {e}")))?
        .to_string();

    Ok(hash)
}

/// Создаёт/обновляет admin пользователя.
/// - если пользователя нет -> создаём
/// - если есть -> гарантируем role=admin и (опционально) обновляем пароль
pub async fn ensure_admin(pool: &PgPool, cfg: &Config) -> error::Result<()> {
    let login = "admin";
    let pw_hash = hash_password(&cfg.admin_password)?;

    sqlx::query(
        r#"
        INSERT INTO users (login, password_hash, role)
        VALUES ($1, $2, 'admin')
        ON CONFLICT (login) DO UPDATE
        SET role = 'admin',
            password_hash = EXCLUDED.password_hash
        "#,
    )
    .bind(login)
    .bind(pw_hash)
    .execute(pool)
    .await
    .map_err(error::Error::Sqlx)?;

    tracing::info!("✅ admin ensured (login={})", login);
    Ok(())
}
