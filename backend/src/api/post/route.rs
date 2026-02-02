use axum::{
    Router,
    routing::{delete, get, post, put},
};

use crate::api::post::handler;
use crate::app::Context;

pub fn routes() -> Router<Context> {
    Router::new()
        .route("/search", get(handler::search))
        .route("/get/{id}", get(handler::get))
        .route("/{id}/quiz", get(handler::get_quiz))
        .route("/{id}/quiz/submit", post(handler::submit_quiz))
        .route("/{id}/quiz/attempt", get(handler::get_quiz_attempt))
        .route("/create", post(handler::create))
        .route("/suggest", post(handler::suggest))
        .route("/update/{id}", put(handler::update))
        .route("/set-public/{id}", put(handler::set_public))
        .route("/delete/{id}", delete(handler::delete))
        .route("/quiz/question/create", post(handler::create_quiz_question))
        .route("/quiz/question/update/{id}", put(handler::update_quiz_question))
        .route("/quiz/question/delete/{id}", delete(handler::delete_quiz_question))
        .route("/quiz/option/create", post(handler::create_quiz_option))
        .route("/quiz/option/update/{id}", put(handler::update_quiz_option))
        .route("/quiz/option/delete/{id}", delete(handler::delete_quiz_option))
}
