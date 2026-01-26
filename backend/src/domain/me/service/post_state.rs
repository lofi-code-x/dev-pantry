use sqlx::PgPool;

use crate::domain::me::model::PostState;
use crate::domain::me::repo;
use crate::error;

pub async fn get(pool: &PgPool, user_id: i64, post_id: i64) -> error::Result<PostState> {
    repo::select_post_state(pool, user_id, post_id).await
}
