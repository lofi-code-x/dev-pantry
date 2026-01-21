use crate::api::error::{ApiError, JsonResult, StatusResult};
use crate::app::Context;
use crate::auth::extractor::StaffUser;
use crate::domain::post::dto::{PostCreateRequest, PostRequest};
use crate::domain::post::model::Post;
use crate::domain::post::service;
use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;

pub async fn search(
    State(ctx): State<Context>,
    Query(req): Query<PostRequest>,
) -> JsonResult<Vec<Post>> {
    let response = service::search(&ctx.pool, req)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(response)))
}

pub async fn get(State(ctx): State<Context>, Path(id): Path<i64>) -> JsonResult<Post> {
    let response = service::get(&ctx.pool, id).await.map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(response)))
}

pub async fn create(
    StaffUser(_staff): StaffUser,
    State(ctx): State<Context>,
    Json(req): Json<PostCreateRequest>,
) -> JsonResult<i64> {
    let response = service::create(&ctx.pool, req)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn update(
    StaffUser(_staff): StaffUser,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
    Json(req): Json<PostCreateRequest>,
) -> JsonResult<i64> {
    let response = service::update(&ctx.pool, req, id)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn delete(
    StaffUser(_staff): StaffUser,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
) -> StatusResult {
    service::delete(&ctx.pool, id)
        .await
        .map_err(ApiError::map)?;

    Ok(StatusCode::NO_CONTENT)
}
