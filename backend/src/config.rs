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
        let cfg = include_str!("../config-dev.toml");
        let cfg = toml::from_str::<Config>(cfg)?;
        Ok(cfg)
    }
}
