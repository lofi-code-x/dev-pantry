use crate::api::user::handler;
use crate::app::Context;
use axum::Router;
use axum::routing::post;

pub fn routes() -> Router<Context> {
    Router::new()
        .route("/login", post(handler::login))
        .route("/create", post(handler::create))
}
