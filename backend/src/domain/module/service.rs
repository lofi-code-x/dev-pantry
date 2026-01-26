// src/domain/module/service.rs

use crate::domain::module::dto::{
    InsertModuleItemParams, InsertModuleParams, UpdateModuleItemParams, UpdateModuleParams,
};
use crate::domain::module::model::{Module, ModuleItem};
use crate::domain::module::repo;
use crate::domain::post::model::Post;
use crate::error;
use sqlx::PgPool;

//---------------------------------------- Module ----------------------------------------------------

pub async fn list(pool: &PgPool, only_published: bool) -> error::Result<Vec<Module>> {
    repo::select_module_list(pool, only_published).await
}

pub async fn get_module(pool: &PgPool, id: i64) -> error::Result<Module> {
    repo::select_module_by_id(pool, id)
        .await?
        .ok_or(error::Error::NotFound(format!("module {} not found", id)))
}

pub async fn create_module(pool: &PgPool, params: InsertModuleParams) -> error::Result<i64> {
    repo::insert_module(pool, params).await
}

pub async fn update_module(
    pool: &PgPool,
    id: i64,
    params: UpdateModuleParams,
) -> error::Result<i64> {
    let updated_id = repo::update_module_by_id(pool, id, params)
        .await?
        .ok_or(error::Error::NotFound(format!("Module {} not found.", id)))?;

    Ok(updated_id)
}

pub async fn delete_module(pool: &PgPool, id: i64) -> error::Result<()> {
    let rows = repo::delete_module_by_id(pool, id).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!("Module {} not found.", id)));
    }
    Ok(())
}

//------------------------------------- Module Items ------------------------------------------------

pub async fn get_module_posts(
    pool: &PgPool,
    module_id: i64,
    only_published: bool,
) -> error::Result<Vec<Post>> {
    repo::select_module_posts(pool, module_id, only_published).await
}

pub async fn list_module_items(pool: &PgPool, module_id: i64) -> error::Result<Vec<ModuleItem>> {
    repo::select_module_items(pool, module_id).await
}

pub async fn add_module_item(pool: &PgPool, params: InsertModuleItemParams) -> error::Result<i64> {
    repo::insert_module_item(pool, params).await
}

pub async fn update_module_item(
    pool: &PgPool,
    id: i64,
    params: UpdateModuleItemParams,
) -> error::Result<()> {
    let rows = repo::update_module_item_by_id(pool, id, params).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!(
            "Module item {} not found.",
            id
        )));
    }
    Ok(())
}

pub async fn delete_module_item(pool: &PgPool, id: i64) -> error::Result<()> {
    let rows = repo::delete_module_item_by_id(pool, id).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!(
            "Module item {} not found.",
            id
        )));
    }
    Ok(())
}

pub async fn set_public(pool: &PgPool, id: i64, is_public: bool) -> error::Result<()> {
    let rows = repo::set_public_module_by_id(pool, id, is_public).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!("Module {} not found.", id)));
    }
    Ok(())
}
