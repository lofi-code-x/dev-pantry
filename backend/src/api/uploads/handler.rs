use crate::api::error::{ApiError, JsonResult};
use crate::app::Context;
use crate::auth::extractor::StaffUser;
use crate::domain::uploads::dto::UploadResponse;
use crate::domain::uploads::service;
use axum::Json;
use axum::extract::{Multipart, State};
use axum::http::StatusCode;

pub async fn upload_image(
    StaffUser(_admin): StaffUser,
    State(_ctx): State<Context>,
    multipart: Multipart,
) -> JsonResult<UploadResponse> {
    let response = service::upload(multipart).await.map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(response)))
}
