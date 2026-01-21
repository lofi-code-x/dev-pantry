use crate::api::error::{ApiError, JsonResult, StatusResult};
use crate::app::Context;
use crate::auth::extractor::StaffUser;
use crate::domain::category::dto::CategoryRequest;
use crate::domain::category::model::Category;
use crate::domain::category::service;
use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;

pub async fn get_all(State(ctx): State<Context>) -> JsonResult<Vec<Category>> {
    let response = service::get_all(&ctx).await.map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(response)))
}

pub async fn create(
    StaffUser(_staff): StaffUser,
    State(ctx): State<Context>,
    Json(payload): Json<CategoryRequest>,
) -> JsonResult<Category> {
    let response = service::create(&ctx, payload)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn delete(
    StaffUser(_staff): StaffUser,
    State(ctx): State<Context>,
    Path(tag): Path<String>,
) -> StatusResult {
    service::delete(&ctx, &tag).await.map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}
