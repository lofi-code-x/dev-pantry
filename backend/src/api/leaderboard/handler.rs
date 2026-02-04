use crate::api::error::{ApiError, JsonResult};
use crate::app::Context;
use crate::domain::xp::model::LeaderboardUser;
use crate::domain::xp::service;
use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;

pub async fn get_leaderboard(
    State(ctx): State<Context>,
) -> JsonResult<Vec<LeaderboardUser>> {
    let res = service::list_leaderboard(&ctx.pool, 100)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(res)))
}
