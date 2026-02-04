use crate::api::error::{ApiError, JsonResult, StatusResult};
use crate::app::Context;
use crate::auth::extractor::Client;
use crate::domain::uploads::dto::{ModuleImagesBatchQuery, UploadResponse, UploadView};
use crate::domain::uploads::service;
use axum::Json;
use axum::extract::{Multipart, Path, Query, State};
use axum::http::StatusCode;
use std::collections::HashMap;

// POST /api/uploads/images
pub async fn upload_image(
    client: Client,
    State(ctx): State<Context>,
    multipart: Multipart,
) -> JsonResult<UploadResponse> {
    let user = client.require_user()?;
    let resp = service::upload_image(&ctx.pool, multipart, Some(user.id))
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(resp)))
}

// POST /api/uploads/avatar
pub async fn upload_avatar(
    client: Client,
    State(ctx): State<Context>,
    multipart: Multipart,
) -> JsonResult<UploadResponse> {
    let user = client.require_user()?;
    let resp = service::upload_user_avatar(&ctx.pool, multipart, user.id)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(resp)))
}

// DELETE /api/uploads/avatar
pub async fn delete_avatar(client: Client, State(ctx): State<Context>) -> StatusResult {
    let user = client.require_user()?;
    service::delete_user_avatar(&ctx.pool, user.id)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}

// GET /api/uploads/images/{post_id}
pub async fn list_images(
    State(ctx): State<Context>,
    Path(post_id): Path<i64>,
) -> JsonResult<Vec<UploadView>> {
    let resp = service::list_post_image_views(&ctx.pool, post_id)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(resp)))
}

// ✅ GET /api/uploads/modules/{module_id}/images
pub async fn list_module_images(
    State(ctx): State<Context>,
    Path(module_id): Path<i64>,
) -> JsonResult<Vec<UploadView>> {
    let resp = service::list_module_image_views(&ctx.pool, module_id)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(resp)))
}

pub async fn list_module_images_batch(
    State(ctx): State<Context>,
    Query(q): Query<ModuleImagesBatchQuery>,
) -> JsonResult<HashMap<i64, Option<UploadView>>> {
    let ids = q.ids.as_deref().map(parse_ids_csv).unwrap_or_default();

    // (опционально) safety limit
    if ids.len() > 200 {
        return Err(ApiError::bad_request("Too many ids (max 200).".to_string()));
    }

    let resp = service::list_module_image_views_batch(&ctx.pool, &ids)
        .await
        .map_err(ApiError::map)?;

    Ok((StatusCode::OK, Json(resp)))
}

fn parse_ids_csv(s: &str) -> Vec<i64> {
    let mut out = Vec::new();

    for part in s.split(',') {
        let p = part.trim();
        if let Ok(n) = p.parse::<i64>()
            && n > 0
        {
            out.push(n);
        }
    }

    out.sort_unstable();
    out.dedup();
    out
}
