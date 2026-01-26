use sqlx::PgPool;

use crate::domain::me::model::ModuleProgress;
use crate::domain::me::repo;
use crate::error;

pub async fn list_progress(pool: &PgPool, user_id: i64) -> error::Result<Vec<ModuleProgress>> {
    repo::list_module_progress(pool, user_id).await
}
