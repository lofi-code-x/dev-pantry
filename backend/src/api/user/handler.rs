use crate::api::error::{ApiError, JsonResult};
use crate::app::Context;
use crate::domain::user::dto::{AuthResponse, LoginRequest};
use crate::domain::user::service;
use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;

pub async fn create(
    State(ctx): State<Context>,
    Json(payload): Json<LoginRequest>,
) -> JsonResult<AuthResponse> {
    let response = service::create(&ctx, payload)
        .await
        .map_err(ApiError::map)?;

    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn login(
    State(ctx): State<Context>,
    Json(payload): Json<LoginRequest>,
) -> JsonResult<AuthResponse> {
    let response = service::login(&ctx, payload).await.map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(response)))
}
