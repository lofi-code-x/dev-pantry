use crate::auth::jwt::JwtKeys;
use crate::config::Config;
use crate::error;
use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Pool, Postgres};
use std::sync::Arc;
use std::time::Duration;

#[derive(Clone)]
pub struct Context {
    pub cfg: Config,
    pub pool: PgPool,
    pub jwt_keys: Arc<JwtKeys>,
}

impl Context {
    pub async fn new() -> error::Result<Self> {
        let cfg = Config::load()?;

        let pool = connect(&cfg).await?;
        let jwt_keys = Arc::new(JwtKeys::from(&cfg));

        Ok(Self {
            cfg,
            pool,
            jwt_keys,
        })
    }
}

pub async fn connect(cfg: &Config) -> error::Result<Pool<Postgres>> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&cfg.postgres_conn)
        .await?;

    sqlx::migrate!("././migrations").run(&pool).await?;

    Ok(pool)
}
