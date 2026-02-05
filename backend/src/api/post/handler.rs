use crate::api::error::{ApiError, JsonResult, StatusResult};
use crate::app::Context;
use crate::auth::extractor::Client;
use crate::domain::post::dto::{
    InsertQuizOptionParams, InsertQuizQuestionParams, PostCreateRequest, PostRequest,
    PostSetPublicRequest, QuizAttemptView, QuizQuestionAdminView, QuizQuestionView,
    QuizSubmitRequest, QuizSubmitResult, UpdateQuizOptionParams, UpdateQuizQuestionParams,
};
use crate::domain::post::model::Post;
use crate::domain::post::service;
use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;

pub async fn search(
    client: Client,
    State(ctx): State<Context>,
    Query(req): Query<PostRequest>,
) -> JsonResult<Vec<Post>> {
    let only_published = !client.is_staff();
    let response = service::search(&ctx.pool, req, only_published)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(response)))
}

pub async fn get(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
) -> JsonResult<Post> {
    let only_published = !client.is_staff();
    let response = service::get(&ctx.pool, id, only_published)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(response)))
}

pub async fn create(
    client: Client,
    State(ctx): State<Context>,
    Json(req): Json<PostCreateRequest>,
) -> JsonResult<i64> {
    client.require_staff()?;
    let response = service::create(&ctx.pool, req, true)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn suggest(
    client: Client,
    State(ctx): State<Context>,
    Json(req): Json<PostCreateRequest>,
) -> JsonResult<i64> {
    client.require_user()?;
    let response = service::create(&ctx.pool, req, false)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn update(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
    Json(req): Json<PostCreateRequest>,
) -> JsonResult<i64> {
    client.require_staff()?;
    let updated_id = service::update(&ctx.pool, req, id)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(updated_id)))
}

pub async fn set_public(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
    Json(req): Json<PostSetPublicRequest>,
) -> StatusResult {
    client.require_staff()?;
    service::set_public(&ctx.pool, id, req.is_public)
        .await
        .map_err(ApiError::map)?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn delete(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
) -> StatusResult {
    client.require_staff()?;
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

pub async fn get_quiz_admin(
    client: Client,
    State(ctx): State<Context>,
    Path(post_id): Path<i64>,
) -> JsonResult<Vec<QuizQuestionAdminView>> {
    client.require_staff()?;
    let res = service::list_quiz_questions_admin(&ctx.pool, post_id)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(res)))
}

pub async fn submit_quiz(
    client: Client,
    State(ctx): State<Context>,
    Path(post_id): Path<i64>,
    Json(req): Json<QuizSubmitRequest>,
) -> JsonResult<QuizSubmitResult> {
    let user = client.require_user()?;
    let res = service::submit_quiz(&ctx.pool, post_id, user.id, req)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(res)))
}

pub async fn get_quiz_attempt(
    client: Client,
    State(ctx): State<Context>,
    Path(post_id): Path<i64>,
) -> JsonResult<Option<QuizAttemptView>> {
    let user = client.require_user()?;
    let res = service::get_quiz_attempt(&ctx.pool, post_id, user.id)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::OK, Json(res)))
}

// --------------------------- Quiz (staff CRUD) --------------------------

pub async fn create_quiz_question(
    client: Client,
    State(ctx): State<Context>,
    Json(req): Json<InsertQuizQuestionParams>,
) -> JsonResult<i64> {
    client.require_staff()?;
    let id = service::add_quiz_question(&ctx.pool, req)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::CREATED, Json(id)))
}

pub async fn update_quiz_question(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
    Json(req): Json<UpdateQuizQuestionParams>,
) -> StatusResult {
    client.require_staff()?;
    service::update_quiz_question(&ctx.pool, id, req)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn delete_quiz_question(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
) -> StatusResult {
    client.require_staff()?;
    service::delete_quiz_question(&ctx.pool, id)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn create_quiz_option(
    client: Client,
    State(ctx): State<Context>,
    Json(req): Json<InsertQuizOptionParams>,
) -> JsonResult<i64> {
    client.require_staff()?;
    let id = service::add_quiz_option(&ctx.pool, req)
        .await
        .map_err(ApiError::map)?;
    Ok((StatusCode::CREATED, Json(id)))
}

pub async fn update_quiz_option(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
    Json(req): Json<UpdateQuizOptionParams>,
) -> StatusResult {
    client.require_staff()?;
    service::update_quiz_option(&ctx.pool, id, req)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn delete_quiz_option(
    client: Client,
    State(ctx): State<Context>,
    Path(id): Path<i64>,
) -> StatusResult {
    client.require_staff()?;
    service::delete_quiz_option(&ctx.pool, id)
        .await
        .map_err(ApiError::map)?;
    Ok(StatusCode::NO_CONTENT)
}
