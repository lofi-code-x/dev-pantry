use crate::api::error::{ApiError, JsonResult, StatusResult};
use crate::app::Context;
use crate::auth::extractor::Client;
use crate::domain::user::dto::{AdminUserListResponse, UpdateUserRoleRequest};
use crate::domain::user::model::UserRole;
use crate::domain::user::service;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;

#[derive(serde::Deserialize)]
pub struct AdminUsersQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub q: Option<String>,
}

pub async fn list_users(
    client: Client,
    State(ctx): State<Context>,
    Query(q): Query<AdminUsersQuery>,
) -> JsonResult<AdminUserListResponse> {
    let user = client.require_user()?;
    if user.role != UserRole::Admin {
        return Err(ApiError::forbidden());
    }

    let page = q.page.unwrap_or(1);
    let limit = q.limit.unwrap_or(50);

    let res = service::list_users_admin(&ctx, page, limit, q.q)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(res)))
}

pub async fn update_user_role(
    client: Client,
    State(ctx): State<Context>,
    Path(user_id): Path<i64>,
    Json(body): Json<UpdateUserRoleRequest>,
) -> StatusResult {
    let user = client.require_user()?;
    if user.role != UserRole::Admin {
        return Err(ApiError::forbidden());
    }

    service::update_user_role_admin(&ctx, user_id, body.role)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn delete_user(
    client: Client,
    State(ctx): State<Context>,
    Path(user_id): Path<i64>,
) -> StatusResult {
    let user = client.require_user()?;
    if user.role != UserRole::Admin {
        return Err(ApiError::forbidden());
    }

    service::delete_user_admin(&ctx, user_id)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}
