use crate::api::post::handler;
use crate::app::Context;
use axum::Router;
use axum::routing::{delete, get, post, put};

pub fn routes() -> Router<Context> {
    Router::new()
        .route("/search", get(handler::search))
        .route("/get/{id}", get(handler::get))
        .route("/create", post(handler::create))
        .route("/update/{id}", put(handler::update))
        .route("/delete/{id}", delete(handler::delete))
}
