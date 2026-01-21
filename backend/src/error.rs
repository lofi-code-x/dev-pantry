use argon2::password_hash;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
    #[error(transparent)]
    Migrate(#[from] sqlx::migrate::MigrateError),
    #[error(transparent)]
    Multipart(#[from] axum::extract::multipart::MultipartError),
    #[error("{0}")]
    Argon2(argon2::Error),
    #[error("{0}")]
    PassHash(password_hash::Error),
    #[error("{0}")]
    Verify(password_hash::Error),
    #[error("{0}")]
    Config(#[from] toml::de::Error),
    #[error("{0}")]
    JsonWebToken(String),
    
    #[error("{0}")]
    BadRequest(String),
    #[error("{0}")]
    Internal(String),
    #[error("{0}")]
    NotFound(String),
}
pub type Result<T> = std::result::Result<T, Error>;