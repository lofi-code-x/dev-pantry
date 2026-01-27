// src/domain/module/service.rs

use crate::domain::module::dto::{
    InsertModuleItemParams, InsertModuleParams, ModulePostNav, PostNav, UpdateModuleItemParams,
    UpdateModuleParams,
};
use crate::domain::module::model::{Module, ModuleItem};
use crate::domain::module::repo;
use crate::domain::post::model::Post;
use crate::error;
use sqlx::PgPool;
use std::collections::HashMap;

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

pub async fn get_post_nav(
    pool: &PgPool,
    post_id: i64,
    module_id: Option<i64>,
) -> error::Result<ModulePostNav> {
    // 1) module_id
    let module_id = match module_id {
        Some(mid) => mid,
        None => {
            let mids = repo::list_module_ids_by_post_id(pool, post_id).await?;
            mids.into_iter()
                .next()
                .ok_or(error::Error::NotFound(format!(
                    "Post {} is not in any module.",
                    post_id
                )))?
        }
    };

    // 2) список post_id по порядку
    let post_ids = repo::list_post_ids_by_module_id(pool, module_id).await?;
    let idx = post_ids
        .iter()
        .position(|&id| id == post_id)
        .ok_or(error::Error::NotFound(format!(
            "Post {} is not in module {}.",
            post_id, module_id
        )))?;

    let prev_id = if idx > 0 {
        Some(post_ids[idx - 1])
    } else {
        None
    };
    let next_id = if idx + 1 < post_ids.len() {
        Some(post_ids[idx + 1])
    } else {
        None
    };

    // Если titles не нужны — можно вернуть сразу.
    // Но ты добавил 3-й запрос, поэтому соберём title для prev/next.
    let mut need: Vec<i64> = Vec::with_capacity(2);
    if let Some(id) = prev_id {
        need.push(id);
    }
    if let Some(id) = next_id {
        // если вдруг prev == next (не должно быть, но на всякий)
        if !need.contains(&id) {
            need.push(id);
        }
    }

    let titles = repo::list_post_titles_by_ids(pool, &need).await?;
    let map: HashMap<i64, String> = titles.into_iter().collect();

    let prev = prev_id.and_then(|id| map.get(&id).cloned().map(|title| PostNav { id, title }));
    let next = next_id.and_then(|id| map.get(&id).cloned().map(|title| PostNav { id, title }));

    Ok(ModulePostNav {
        module_id,
        prev,
        next,
    })
}
