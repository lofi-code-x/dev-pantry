use crate::api::error::{ApiError, JsonResult, StatusResult};
use crate::app::Context;
use crate::auth::extractor::{CurrentUser, StaffUser};
use crate::domain::post::dto::{
    InsertQuizOptionParams, InsertQuizQuestionParams, PostCreateRequest, PostRequest,
    PostSetPublicRequest, QuizAttemptView, QuizQuestionView, QuizSubmitRequest,
    QuizSubmitResult, UpdateQuizOptionParams, UpdateQuizQuestionParams,
};
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
    let response = service::create(&ctx.pool, req, true)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn suggest(
    CurrentUser(_user): CurrentUser,
    State(ctx): State<Context>,
    Json(req): Json<PostCreateRequest>,
) -> JsonResult<i64> {
    let response = service::create(&ctx.pool, req, false)
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
    let updated_id = service::update(&ctx.pool, req, id)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(updated_id)))
}

pub async fn set_public(
    StaffUser(_staff): StaffUser,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
    Json(req): Json<PostSetPublicRequest>,
) -> StatusResult {
    service::set_public(&ctx.pool, id, req.is_public)
        .await
        .map_err(ApiError::map)?;

    Ok(StatusCode::NO_CONTENT)
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

// ------------------------------- Quiz ----------------------------------

pub async fn get_quiz(
    State(ctx): State<Context>,
    Path(post_id): Path<i64>,
) -> JsonResult<Vec<QuizQuestionView>> {
    let res = service::list_quiz_questions(&ctx.pool, post_id)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(res)))
}

pub async fn submit_quiz(
    CurrentUser(user): CurrentUser,
    State(ctx): State<Context>,
    Path(post_id): Path<i64>,
    Json(req): Json<QuizSubmitRequest>,
) -> JsonResult<QuizSubmitResult> {
    let res = service::submit_quiz(&ctx.pool, post_id, user.id, req)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(res)))
}

pub async fn get_quiz_attempt(
    CurrentUser(user): CurrentUser,
    State(ctx): State<Context>,
    Path(post_id): Path<i64>,
) -> JsonResult<Option<QuizAttemptView>> {
    let res = service::get_quiz_attempt(&ctx.pool, post_id, user.id)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(res)))
}

// --------------------------- Quiz (staff CRUD) --------------------------

pub async fn create_quiz_question(
    StaffUser(_staff): StaffUser,
    State(ctx): State<Context>,
    Json(req): Json<InsertQuizQuestionParams>,
) -> JsonResult<i64> {
    let id = service::add_quiz_question(&ctx.pool, req)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::CREATED, Json(id)))
}

pub async fn update_quiz_question(
    StaffUser(_staff): StaffUser,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
    Json(req): Json<UpdateQuizQuestionParams>,
) -> StatusResult {
    service::update_quiz_question(&ctx.pool, id, req)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn delete_quiz_question(
    StaffUser(_staff): StaffUser,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
) -> StatusResult {
    service::delete_quiz_question(&ctx.pool, id)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn create_quiz_option(
    StaffUser(_staff): StaffUser,
    State(ctx): State<Context>,
    Json(req): Json<InsertQuizOptionParams>,
) -> JsonResult<i64> {
    let id = service::add_quiz_option(&ctx.pool, req)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::CREATED, Json(id)))
}

pub async fn update_quiz_option(
    StaffUser(_staff): StaffUser,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
    Json(req): Json<UpdateQuizOptionParams>,
) -> StatusResult {
    service::update_quiz_option(&ctx.pool, id, req)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn delete_quiz_option(
    StaffUser(_staff): StaffUser,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
) -> StatusResult {
    service::delete_quiz_option(&ctx.pool, id)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}
