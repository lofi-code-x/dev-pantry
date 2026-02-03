use crate::api::error::{ApiError, JsonResult, StatusResult};
use crate::app::Context;
use crate::auth::extractor::Client;
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
    client: Client,
    State(ctx): State<Context>,
    Json(payload): Json<CategoryRequest>,
) -> JsonResult<Category> {
    client.require_staff()?;

    let response = service::create(&ctx, payload)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn delete(
    client: Client,
    State(ctx): State<Context>,
    Path(tag): Path<String>,
) -> StatusResult {
    client.require_staff()?;

    service::delete(&ctx, &tag).await.map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}
