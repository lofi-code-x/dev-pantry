// src/api/module/handler.rs

use crate::api::error::{ApiError, JsonResult, StatusResult};
use crate::app::Context;
use crate::auth::extractor::Client;
use crate::domain::module::dto::{
    InsertModuleItemParams, InsertModuleParams, InsertModuleSectionParams, ModulePostNav,
    ModuleSectionPosts, ModuleSetPublicRequest, NavByPostQuery, UpdateModuleItemParams,
    UpdateModuleParams, UpdateModuleSectionParams,
};
use crate::domain::module::model::{Module, ModuleItem, ModuleSection};
use crate::domain::module::service;
use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
// ------------------------------- Module ---------------------------------

/// GET /api/module/list
pub async fn list(client: Client, State(ctx): State<Context>) -> JsonResult<Vec<Module>> {
    let only_published = !client.is_staff();
    let response = service::list(&ctx.pool, only_published)
        .await
        .map_err(ApiError::map)?;

    Ok((StatusCode::OK, Json(response)))
}

/// GET /api/module/get/{id}
pub async fn get(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
) -> JsonResult<Module> {
    let only_published = !client.is_staff();
    let m = service::get_module(&ctx.pool, id, only_published)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(m)))
}

/// GET /api/module/{id}/posts
pub async fn get_posts(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
) -> JsonResult<Vec<ModuleSectionPosts>> {
    let only_published = !client.is_staff();
    let response = service::get_module_posts(&ctx.pool, id, only_published)
        .await
        .map_err(ApiError::map)?;

    Ok((StatusCode::OK, Json(response)))
}

pub async fn list_items(
    State(ctx): State<Context>,
    Path(id): Path<i64>,
) -> JsonResult<Vec<ModuleItem>> {
    let items = service::list_module_items(&ctx.pool, id)
        .await
        .map_err(ApiError::map)?;

    Ok((StatusCode::OK, Json(items)))
}

pub async fn list_sections(
    State(ctx): State<Context>,
    Path(id): Path<i64>,
) -> JsonResult<Vec<ModuleSection>> {
    let sections = service::list_module_sections(&ctx.pool, id)
        .await
        .map_err(ApiError::map)?;

    Ok((StatusCode::OK, Json(sections)))
}

/// POST /api/module/create (staff)
pub async fn create(
    client: Client,
    State(ctx): State<Context>,
    Json(params): Json<InsertModuleParams>,
) -> JsonResult<i64> {
    client.require_staff()?;
    let id = service::create_module(&ctx.pool, params)
        .await
        .map_err(ApiError::map)?;

    Ok((StatusCode::CREATED, Json(id)))
}

/// PUT /api/module/update/{id} (staff) -> id
pub async fn update(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
    Json(params): Json<UpdateModuleParams>,
) -> JsonResult<i64> {
    client.require_staff()?;
    let updated_id = service::update_module(&ctx.pool, id, params)
        .await
        .map_err(ApiError::map)?;

    Ok((StatusCode::OK, Json(updated_id)))
}

/// PUT /api/module/set-public/{id} (staff) -> 204
pub async fn set_public(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
    Json(req): Json<ModuleSetPublicRequest>,
) -> StatusResult {
    client.require_staff()?;
    service::set_public(&ctx.pool, id, req.is_public)
        .await
        .map_err(ApiError::map)?;

    Ok(StatusCode::NO_CONTENT)
}

/// DELETE /api/module/delete/{id} (staff) -> 204
pub async fn delete(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
) -> StatusResult {
    client.require_staff()?;
    service::delete_module(&ctx.pool, id)
        .await
        .map_err(ApiError::map)?;

    Ok(StatusCode::NO_CONTENT)
}

// ---------------------------- Module Items ------------------------------

/// POST /api/module/item/create (staff) -> id
pub async fn create_item(
    client: Client,
    State(ctx): State<Context>,
    Json(params): Json<InsertModuleItemParams>,
) -> JsonResult<i64> {
    client.require_staff()?;
    let id = service::add_module_item(&ctx.pool, params)
        .await
        .map_err(ApiError::map)?;

    Ok((StatusCode::CREATED, Json(id)))
}

/// PUT /api/module/item/update/{id} (staff) -> 204
pub async fn update_item(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
    Json(params): Json<UpdateModuleItemParams>,
) -> StatusResult {
    client.require_staff()?;
    service::update_module_item(&ctx.pool, id, params)
        .await
        .map_err(ApiError::map)?;

    Ok(StatusCode::NO_CONTENT)
}

/// DELETE /api/module/item/delete/{id} (staff) -> 204
pub async fn delete_item(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
) -> StatusResult {
    client.require_staff()?;
    service::delete_module_item(&ctx.pool, id)
        .await
        .map_err(ApiError::map)?;

    Ok(StatusCode::NO_CONTENT)
}

// ---------------------------- Module Sections --------------------------

/// POST /api/module/section/create (staff) -> id
pub async fn create_section(
    client: Client,
    State(ctx): State<Context>,
    Json(params): Json<InsertModuleSectionParams>,
) -> JsonResult<i64> {
    client.require_staff()?;
    let id = service::add_module_section(&ctx.pool, params)
        .await
        .map_err(ApiError::map)?;

    Ok((StatusCode::CREATED, Json(id)))
}

/// PUT /api/module/section/update/{id} (staff) -> 204
pub async fn update_section(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
    Json(params): Json<UpdateModuleSectionParams>,
) -> StatusResult {
    client.require_staff()?;
    service::update_module_section(&ctx.pool, id, params)
        .await
        .map_err(ApiError::map)?;

    Ok(StatusCode::NO_CONTENT)
}

/// DELETE /api/module/section/delete/{id} (staff) -> 204
pub async fn delete_section(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
) -> StatusResult {
    client.require_staff()?;
    service::delete_module_section(&ctx.pool, id)
        .await
        .map_err(ApiError::map)?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn nav_by_post(
    State(ctx): State<Context>,
    Path(post_id): Path<i64>,
    Query(q): Query<NavByPostQuery>,
) -> JsonResult<ModulePostNav> {
    let nav = service::get_post_nav(&ctx.pool, post_id, q.module_id)
        .await
        .map_err(ApiError::map)?;

    Ok((StatusCode::OK, Json(nav)))
}
