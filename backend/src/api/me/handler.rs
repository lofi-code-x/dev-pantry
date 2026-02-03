use crate::api::error::{ApiError, JsonResult, StatusResult};
use crate::app::Context;
use crate::auth::extractor::Client;
use crate::domain::me::dto::{OnlyPublishedQuery, PostIdBody, ProgressListQuery};
use crate::domain::me::model::{BookmarkedPost, ModuleProgress, PostState, ProgressPost};
use crate::domain::me::service::{bookmarks, module, post_state, progress};
use crate::domain::xp;
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};

// ------------------------------ Bookmarks -------------------------------

pub async fn list_bookmarks(
    client: Client,
    State(ctx): State<Context>,
    Query(q): Query<OnlyPublishedQuery>,
) -> JsonResult<Vec<BookmarkedPost>> {
    let user = client.require_user()?;
    let only_published = q.only_published.unwrap_or(true);
    let response = bookmarks::list(&ctx.pool, user.id, only_published)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(response)))
}

pub async fn add_bookmark(
    client: Client,
    State(ctx): State<Context>,
    Json(body): Json<PostIdBody>,
) -> StatusResult {
    let user = client.require_user()?;
    bookmarks::add(&ctx.pool, user.id, body.post_id)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn remove_bookmark(
    client: Client,
    State(ctx): State<Context>,
    Path(post_id): Path<i64>,
) -> StatusResult {
    let user = client.require_user()?;
    bookmarks::remove(&ctx.pool, user.id, post_id)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}

// ------------------------------- Progress --------------------------------

pub async fn list_reads(
    client: Client,
    State(ctx): State<Context>,
    Query(q): Query<ProgressListQuery>,
) -> JsonResult<Vec<ProgressPost>> {
    let user = client.require_user()?;
    let only_published = q.only_published.unwrap_or(true);

    let response = progress::list(&ctx.pool, user.id, only_published, q.only_completed)
        .await
        .map_err(ApiError::map)?;

    Ok((StatusCode::OK, Json(response)))
}

pub async fn mark_read_completed(
    client: Client,
    State(ctx): State<Context>,
    Path(post_id): Path<i64>,
) -> StatusResult {
    let user = client.require_user()?;
    progress::mark_completed(&ctx.pool, user.id, post_id)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn uncomplete_read(
    client: Client,
    State(ctx): State<Context>,
    Path(post_id): Path<i64>,
) -> StatusResult {
    let user = client.require_user()?;
    progress::uncomplete(&ctx.pool, user.id, post_id)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_post_state(
    client: Client,
    State(ctx): State<Context>,
    Path(post_id): Path<i64>,
) -> JsonResult<PostState> {
    let user = client.require_user()?;
    let st = post_state::get(&ctx.pool, user.id, post_id)
        .await
        .map_err(ApiError::map)?;

    Ok((StatusCode::OK, Json(st)))
}

/// GET /api/me/modules/progress
pub async fn list_module_progress(
    client: Client,
    State(ctx): State<Context>,
) -> JsonResult<Vec<ModuleProgress>> {
    let user = client.require_user()?;
    let res = module::list_progress(&ctx.pool, user.id)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(res)))
}

/// GET /api/me/stats
pub async fn get_stats(
    client: Client,
    State(ctx): State<Context>,
) -> JsonResult<xp::model::UserStats> {
    let user = client.require_user()?;
    let stats = xp::service::get_user_stats(&ctx.pool, user.id)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(stats)))
}
