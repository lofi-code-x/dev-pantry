// src/domain/module/service.rs

use crate::domain::module::dto::{
    InsertModuleItemParams, InsertModuleParams, InsertModuleSectionParams, ModulePostNav,
    ModuleSectionPosts, PostNav, UpdateModuleItemParams, UpdateModuleParams,
    UpdateModuleSectionParams,
};
use crate::domain::module::model::{Module, ModuleItem, ModuleSection};
use crate::domain::module::repo;
use crate::domain::post::model::Post;
use crate::domain::uploads;
use crate::domain::uploads::dto::AttachModuleImagesParams;
use crate::error;
use sqlx::PgPool;
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

//---------------------------------------- Module ----------------------------------------------------

pub async fn list(pool: &PgPool, only_published: bool) -> error::Result<Vec<Module>> {
    repo::select_module_list(pool, only_published).await
}

pub async fn get_module(pool: &PgPool, id: i64, only_published: bool) -> error::Result<Module> {
    repo::select_module_by_id(pool, id, only_published)
        .await?
        .ok_or(error::Error::NotFound(format!("module {} not found", id)))
}

/// NOTE:
/// Для "1 картинка = 1 модуль" нужно, чтобы InsertModuleParams содержал:
///   pub image_upload_id: Option<Uuid>
/// (значение - желаемая картинка, None - без картинки)
pub async fn create_module(pool: &PgPool, params: InsertModuleParams) -> error::Result<i64> {
    // desired single image (copy before params moved)
    let image_upload_id: Option<Uuid> = params.image_upload_id;

    // 1) create module
    let module_id = repo::insert_module(pool, params).await?;

    // 2) attach image (single)
    if let Some(upload_id) = image_upload_id {
        uploads::repo::attach_module_images(
            pool,
            AttachModuleImagesParams {
                module_id,
                upload_ids: vec![upload_id],
            },
        )
        .await?;
    }

    Ok(module_id)
}

/// NOTE:
/// Для "1 картинка = 1 модуль" UpdateModuleParams должен содержать:
///   pub image_upload_id: Option<Uuid>
/// И мы считаем, что это ЖЕЛАЕМОЕ состояние:
///   Some(x) -> установить/заменить на x
///   None    -> убрать картинку
pub async fn update_module(
    pool: &PgPool,
    id: i64,
    params: UpdateModuleParams,
) -> error::Result<i64> {
    // desired single image (copy before params moved)
    let new_image: Option<Uuid> = params.image_upload_id;

    // 1) update module fields
    let updated_id = repo::update_module_by_id(pool, id, params)
        .await?
        .ok_or(error::Error::NotFound(format!("Module {} not found.", id)))?;

    // 2) sync module_images (1 image)
    let old_ids = uploads::repo::list_module_image_ids(pool, updated_id).await?;
    let old: HashSet<Uuid> = old_ids.into_iter().collect();

    let mut desired: HashSet<Uuid> = HashSet::new();
    if let Some(u) = new_image {
        desired.insert(u);
    }

    let to_add: Vec<Uuid> = desired.difference(&old).cloned().collect();
    let to_remove: Vec<Uuid> = old.difference(&desired).cloned().collect();

    // detach removed
    if !to_remove.is_empty() {
        uploads::repo::detach_module_images(pool, updated_id, &to_remove).await?;

        // cleanup uploads rows + files only if not used elsewhere (post/module/avatar)
        let in_use = uploads::repo::list_in_use_upload_ids(pool, &to_remove).await?;
        let in_use_set: HashSet<Uuid> = in_use.into_iter().collect();

        let deletable: Vec<Uuid> = to_remove
            .into_iter()
            .filter(|u| !in_use_set.contains(u))
            .collect();

        if !deletable.is_empty() {
            uploads::service::delete_uploads_and_files(pool, &deletable).await?;
        }
    }

    // attach added (single)
    if !to_add.is_empty() {
        uploads::repo::attach_module_images(
            pool,
            AttachModuleImagesParams {
                module_id: updated_id,
                upload_ids: to_add,
            },
        )
        .await?;
    }

    Ok(updated_id)
}

pub async fn delete_module(pool: &PgPool, id: i64) -> error::Result<()> {
    // 1) grab image ids BEFORE delete (module_images will be CASCADE)
    let module_upload_ids = uploads::repo::list_module_image_ids(pool, id).await?;

    // 2) delete module
    let rows = repo::delete_module_by_id(pool, id).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!("Module {} not found.", id)));
    }

    // 3) cleanup uploads + files if not used elsewhere
    if !module_upload_ids.is_empty() {
        let in_use = uploads::repo::list_in_use_upload_ids(pool, &module_upload_ids).await?;
        let in_use_set: HashSet<Uuid> = in_use.into_iter().collect();

        let deletable: Vec<Uuid> = module_upload_ids
            .into_iter()
            .filter(|u| !in_use_set.contains(u))
            .collect();

        if !deletable.is_empty() {
            uploads::service::delete_uploads_and_files(pool, &deletable).await?;
        }
    }

    Ok(())
}

//------------------------------------- Module Items ------------------------------------------------

pub async fn get_module_posts(
    pool: &PgPool,
    module_id: i64,
    only_published: bool,
) -> error::Result<Vec<ModuleSectionPosts>> {
    let sections = repo::select_module_sections(pool, module_id).await?;
    let posts = repo::select_module_posts_with_section(pool, module_id, only_published).await?;

    let mut out: Vec<ModuleSectionPosts> = sections
        .into_iter()
        .map(|s| ModuleSectionPosts {
            id: Some(s.id),
            title: s.title,
            description: s.description,
            sort_order: s.sort_order,
            is_unknown: false,
            posts: Vec::new(),
        })
        .collect();

    let mut index_by_id: HashMap<i64, usize> = HashMap::new();
    for (idx, section) in out.iter().enumerate() {
        if let Some(id) = section.id {
            index_by_id.insert(id, idx);
        }
    }

    let mut unknown_posts: Vec<Post> = Vec::new();
    for (section_id, post) in posts {
        match section_id.and_then(|id| index_by_id.get(&id).copied()) {
            Some(idx) => out[idx].posts.push(post),
            None => unknown_posts.push(post),
        }
    }

    if !unknown_posts.is_empty() {
        out.push(ModuleSectionPosts {
            id: None,
            title: "Без секции".to_string(),
            description: None,
            sort_order: i32::MAX,
            is_unknown: true,
            posts: unknown_posts,
        });
    }

    Ok(out)
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

//------------------------------------- Module Sections ----------------------------------------------

pub async fn list_module_sections(
    pool: &PgPool,
    module_id: i64,
) -> error::Result<Vec<ModuleSection>> {
    repo::select_module_sections(pool, module_id).await
}

pub async fn add_module_section(
    pool: &PgPool,
    params: InsertModuleSectionParams,
) -> error::Result<i64> {
    repo::insert_module_section(pool, params).await
}

pub async fn update_module_section(
    pool: &PgPool,
    id: i64,
    params: UpdateModuleSectionParams,
) -> error::Result<()> {
    let rows = repo::update_module_section_by_id(pool, id, params).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!(
            "Module section {} not found.",
            id
        )));
    }
    Ok(())
}

pub async fn delete_module_section(pool: &PgPool, id: i64) -> error::Result<()> {
    let rows = repo::delete_module_section_by_id(pool, id).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!(
            "Module section {} not found.",
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
