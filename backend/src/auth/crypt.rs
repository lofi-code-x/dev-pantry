use crate::error;
use argon2::password_hash::SaltString;
use argon2::password_hash::rand_core::OsRng;
use argon2::{Argon2, Params, PasswordHash, PasswordHasher, PasswordVerifier, Version};

/// Хеширование пароля (производственный вариант Argon2id)
pub fn hash(password: &str) -> error::Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    let params = Params::new(19 * 1024, 2, 1, None).map_err(error::Error::Argon2)?;
    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, Version::V0x13, params);

    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(error::Error::PassHash)?
        .to_string();

    Ok(hash)
}

/// Проверка пароля
pub fn verify(password: &str, password_hash: &str) -> error::Result<()> {
    let parsed_hash = PasswordHash::new(password_hash).map_err(error::Error::PassHash)?;
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(error::Error::Verify)
}
