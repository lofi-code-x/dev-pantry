use crate::error;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub server_port: i32,
    pub postgres_conn: String,
    pub jwt_secret: String,
    pub jwt_lifetime: i64,
}

impl Config {
    pub fn load() -> error::Result<Self> {
        let app_env = std::env::var("APP_ENV").unwrap_or_else(|_| "dev".to_string());
        if app_env != "prod" && app_env != "production" {
            dotenvy::dotenv().ok();
        }

        let server_port = env_i32("SERVER_PORT").unwrap_or(3001);

        let postgres_conn = env_string("POSTGRES_CONN")
            .or_else(|| env_string("DATABASE_URL"))
            .ok_or_else(|| {
                error::Error::Config("POSTGRES_CONN or DATABASE_URL is required".to_string())
            })?;

        let jwt_secret = env_string("JWT_SECRET")
            .ok_or_else(|| error::Error::Config("JWT_SECRET is required".to_string()))?;

        // ✅ дни -> секунды
        let jwt_lifetime = env_i64("JWT_LIFETIME_DAYS").unwrap_or(7);

        if jwt_lifetime <= 0 {
            return Err(error::Error::Config(
                "JWT_LIFETIME_DAYS must be > 0".to_string(),
            ));
        }

        Ok(Self {
            server_port,
            postgres_conn,
            jwt_secret,
            jwt_lifetime,
        })
    }
}

fn env_string(key: &str) -> Option<String> {
    std::env::var(key).ok().and_then(|v| {
        let v = v.trim().to_string();
        (!v.is_empty()).then_some(v)
    })
}

fn env_i32(key: &str) -> Option<i32> {
    std::env::var(key)
        .ok()
        .and_then(|v| v.trim().parse::<i32>().ok())
}

fn env_i64(key: &str) -> Option<i64> {
    std::env::var(key)
        .ok()
        .and_then(|v| v.trim().parse::<i64>().ok())
}
