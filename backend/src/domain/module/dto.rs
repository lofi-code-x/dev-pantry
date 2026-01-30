// src/domain/module/dto.rs

use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct InsertModuleParams {
    pub title: String,
    pub description: Option<String>,
    pub author_id: i64,
    pub is_published: bool,

    /// 1 картинка = 1 модуль (опционально)
    /// Передаём upload uuid, который вернул /api/uploads/images
    pub image_upload_id: Option<Uuid>,
}

#[derive(Deserialize)]
pub struct UpdateModuleParams {
    pub title: String,
    pub description: Option<String>,

    /// Желаемое состояние картинки:
    /// - Some(uuid) -> поставить/заменить
    /// - None       -> убрать картинку
    pub image_upload_id: Option<Uuid>,
}

#[derive(Deserialize)]
pub struct InsertModuleItemParams {
    pub module_id: i64,
    pub post_id: i64,
    pub sort_order: i32,
}

#[derive(Deserialize)]
pub struct UpdateModuleItemParams {
    pub sort_order: i32,
}

#[derive(serde::Deserialize)]
pub struct OnlyPublishedQuery {
    pub only_published: Option<bool>,
}

#[derive(Deserialize)]
pub struct ModuleSetPublicRequest {
    pub is_public: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PostNav {
    pub id: i64,
    pub title: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ModulePostNav {
    pub module_id: i64,
    pub prev: Option<PostNav>,
    pub next: Option<PostNav>,
}

#[derive(serde::Deserialize)]
pub struct NavByPostQuery {
    pub module_id: Option<i64>,
}
