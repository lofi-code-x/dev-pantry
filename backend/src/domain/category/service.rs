use crate::app::Context;
use crate::domain::category::dto::CategoryRequest;
use crate::domain::category::model::Category;
use crate::domain::category::repo;
use crate::error;

pub async fn create(ctx: &Context, req: CategoryRequest) -> error::Result<Category> {
    let tag = req
        .title
        .trim()
        .to_lowercase()
        .replace(' ', "-")
        .replace(|c: char| !c.is_ascii_alphanumeric() && c != '-', "");

    if tag == "all" {
        return Err(error::Error::BadRequest(
            "The category \"all\" is reserved and cannot be created.".to_string(),
        ));
    }

    repo::insert(&ctx.pool, &tag, &req.title).await
}

pub async fn get_all(ctx: &Context) -> error::Result<Vec<Category>> {
    repo::select_all(&ctx.pool).await
}

pub async fn delete(ctx: &Context, tag: &str) -> error::Result<()> {
    if tag.to_lowercase() == "all" {
        return Err(error::Error::BadRequest(
            "The category \"all\" is reserved and cannot be deleted.".to_string(),
        ));
    }

    let rows = repo::delete(&ctx.pool, tag).await?;

    if rows == 0 {
        return Err(error::Error::NotFound(format!(
            "Category {} not found.",
            tag
        )));
    }

    Ok(())
}
