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
        .route("/create", post(handler::create))
        .route("/suggest", post(handler::suggest))
        .route("/update/{id}", put(handler::update))
        .route("/set-public/{id}", put(handler::set_public))
        .route("/delete/{id}", delete(handler::delete))
}
