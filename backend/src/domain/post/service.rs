use crate::domain::post::dto::{PostCreateRequest, PostRequest};
use crate::domain::post::model::Post;
use crate::domain::post::repo;
use crate::error;
use sqlx::PgPool;

pub async fn search(pool: &PgPool, req: PostRequest) -> error::Result<Vec<Post>> {
    repo::search(pool, req.into()).await
}

pub async fn get(pool: &PgPool, id: i64) -> error::Result<Post> {
    repo::select_by_id(pool, id)
        .await?
        .ok_or(error::Error::NotFound(format!("post {} not found", id)))
}

pub async fn create(pool: &PgPool, req: PostCreateRequest) -> error::Result<i64> {
    repo::insert(pool, req.into()).await
}

pub async fn update(pool: &PgPool, req: PostCreateRequest, id: i64) -> error::Result<i64> {
    repo::update_by_id(pool, req.into(), id).await
}

pub async fn delete(pool: &PgPool, id: i64) -> error::Result<()> {
    let rows = repo::delete_by_id(pool, id).await?;

    if rows == 0 {
        return Err(error::Error::NotFound(format!("Post {} not found.", id)));
    }

    Ok(())
}
