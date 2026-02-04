use crate::api::user::handler;
use crate::app::Context;
use axum::Router;
use axum::routing::{get, post};

pub fn routes() -> Router<Context> {
    Router::new()
        .route("/login", post(handler::login))
        .route("/create", post(handler::create))
}

pub fn public_routes() -> Router<Context> {
    Router::new().route("/{login}", get(handler::get_public_profile))
}
