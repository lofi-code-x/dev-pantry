// src/domain/post/service.rs

use crate::domain::post::dto::{InsertParams, PostCreateRequest, PostRequest, UpdateParams};
use crate::domain::post::model::Post;
use crate::domain::post::repo;
use crate::domain::uploads;
use crate::domain::uploads::dto::AttachPostImagesParams;
use crate::error;
use sqlx::PgPool;
use std::collections::HashSet;
use uuid::Uuid;

pub async fn search(pool: &PgPool, req: PostRequest) -> error::Result<Vec<Post>> {
    repo::search(pool, req.into()).await
}

pub async fn get(pool: &PgPool, id: i64) -> error::Result<Post> {
    repo::select_by_id(pool, id)
        .await?
        .ok_or(error::Error::NotFound(format!("post {} not found", id)))
}

pub async fn create(
    pool: &PgPool,
    mut req: PostCreateRequest,
    is_public: bool,
) -> error::Result<i64> {
    // забираем upload_ids отдельно (чтобы не таскать их в InsertParams)
    let image_upload_ids = std::mem::take(&mut req.image_upload_ids);

    // 1) создаём пост
    let post_id = repo::insert(pool, InsertParams::new(req, is_public)).await?;

    // 2) привязываем картинки
    if !image_upload_ids.is_empty() {
        uploads::repo::attach_post_images(
            pool,
            AttachPostImagesParams {
                post_id,
                upload_ids: image_upload_ids,
            },
        )
        .await?;
    }

    Ok(post_id)
}

pub async fn update(pool: &PgPool, mut req: PostCreateRequest, id: i64) -> error::Result<i64> {
    // 1) забираем новый список картинок
    let new_ids: Vec<Uuid> = std::mem::take(&mut req.image_upload_ids);

    // 2) обновляем сам пост
    let updated_id = repo::update_by_id(pool, UpdateParams::from(req), id)
        .await?
        .ok_or(error::Error::NotFound(format!("Post {} not found.", id)))?;

    // 3) синхронизируем post_images
    let old_ids = uploads::repo::list_post_image_ids(pool, updated_id).await?;

    let old: HashSet<Uuid> = old_ids.into_iter().collect();
    let new: HashSet<Uuid> = new_ids.iter().cloned().collect();

    // что добавить / удалить
    let to_add: Vec<Uuid> = new.difference(&old).cloned().collect();
    let to_remove: Vec<Uuid> = old.difference(&new).cloned().collect();

    // 3.1) detach
    if !to_remove.is_empty() {
        uploads::repo::detach_post_images(pool, updated_id, &to_remove).await?;

        // 3.2) чистим uploads + файлы только если больше нигде не используется
        // (модули/посты/аватар)
        let in_use = uploads::repo::list_in_use_upload_ids(pool, &to_remove).await?;
        let in_use_set: HashSet<Uuid> = in_use.into_iter().collect();

        let deletable: Vec<Uuid> = to_remove
            .into_iter()
            .filter(|u| !in_use_set.contains(u))
            .collect();

        if !deletable.is_empty() {
            // удалит строки из uploads и файл на диске по key
            uploads::service::delete_uploads_and_files(pool, &deletable).await?;
        }
    }

    // 3.3) attach
    if !to_add.is_empty() {
        uploads::repo::attach_post_images(
            pool,
            AttachPostImagesParams {
                post_id: updated_id,
                upload_ids: to_add,
            },
        )
        .await?;
    }

    Ok(updated_id)
}

pub async fn delete(pool: &PgPool, id: i64) -> error::Result<()> {
    // 1) заранее забираем все upload_id, привязанные к посту
    // (после удаления поста они исчезнут из post_images из-за ON DELETE CASCADE)
    let post_upload_ids = uploads::repo::list_post_image_ids(pool, id).await?;

    // 2) удаляем пост
    let rows = repo::delete_by_id(pool, id).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!("Post {} not found.", id)));
    }

    // 3) чистим uploads + файлы только если upload_id больше нигде не используется
    if !post_upload_ids.is_empty() {
        let in_use = uploads::repo::list_in_use_upload_ids(pool, &post_upload_ids).await?;
        let in_use_set: HashSet<Uuid> = in_use.into_iter().collect();

        let deletable: Vec<Uuid> = post_upload_ids
            .into_iter()
            .filter(|u| !in_use_set.contains(u))
            .collect();

        if !deletable.is_empty() {
            uploads::service::delete_uploads_and_files(pool, &deletable).await?;
        }
    }

    Ok(())
}

pub async fn set_public(pool: &PgPool, id: i64, is_public: bool) -> error::Result<()> {
    let rows = repo::set_public_by_id(pool, id, is_public).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!("Post {} not found.", id)));
    }
    Ok(())
}
