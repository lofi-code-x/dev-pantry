use crate::api::error::{ApiError, JsonResult, StatusResult};
use crate::app::Context;
use crate::auth::extractor::CurrentUser;
use crate::domain::me::dto::{OnlyPublishedQuery, PostIdBody, ProgressListQuery};
use crate::domain::me::model::{BookmarkedPost, ModuleProgress, PostState, ProgressPost};
use crate::domain::me::service::{bookmarks, module, post_state, progress};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};

// ------------------------------ Bookmarks -------------------------------

pub async fn list_bookmarks(
    CurrentUser(user): CurrentUser,
    State(ctx): State<Context>,
    Query(q): Query<OnlyPublishedQuery>,
) -> JsonResult<Vec<BookmarkedPost>> {
    let only_published = q.only_published.unwrap_or(true);
    let response = bookmarks::list(&ctx.pool, user.id, only_published)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(response)))
}

pub async fn add_bookmark(
    CurrentUser(user): CurrentUser,
    State(ctx): State<Context>,
    Json(body): Json<PostIdBody>,
) -> StatusResult {
    bookmarks::add(&ctx.pool, user.id, body.post_id)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn remove_bookmark(
    CurrentUser(user): CurrentUser,
    State(ctx): State<Context>,
    Path(post_id): Path<i64>,
) -> StatusResult {
    bookmarks::remove(&ctx.pool, user.id, post_id)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}

// ------------------------------- Progress --------------------------------

pub async fn list_reads(
    CurrentUser(user): CurrentUser,
    State(ctx): State<Context>,
    Query(q): Query<ProgressListQuery>,
) -> JsonResult<Vec<ProgressPost>> {
    let only_published = q.only_published.unwrap_or(true);

    let response = progress::list(&ctx.pool, user.id, only_published, q.only_completed)
        .await
        .map_err(ApiError::map)?;

    Ok((StatusCode::OK, Json(response)))
}

pub async fn mark_read_completed(
    CurrentUser(user): CurrentUser,
    State(ctx): State<Context>,
    Path(post_id): Path<i64>,
) -> StatusResult {
    progress::mark_completed(&ctx.pool, user.id, post_id)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn uncomplete_read(
    CurrentUser(user): CurrentUser,
    State(ctx): State<Context>,
    Path(post_id): Path<i64>,
) -> StatusResult {
    progress::uncomplete(&ctx.pool, user.id, post_id)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_post_state(
    CurrentUser(user): CurrentUser,
    State(ctx): State<Context>,
    Path(post_id): Path<i64>,
) -> JsonResult<PostState> {
    let st = post_state::get(&ctx.pool, user.id, post_id)
        .await
        .map_err(ApiError::map)?;

    Ok((StatusCode::OK, Json(st)))
}

/// GET /api/me/modules/progress
pub async fn list_module_progress(
    CurrentUser(user): CurrentUser,
    State(ctx): State<Context>,
) -> JsonResult<Vec<ModuleProgress>> {
    let res = module::list_progress(&ctx.pool, user.id)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(res)))
}