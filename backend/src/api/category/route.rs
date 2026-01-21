use crate::api::category::handler;
use crate::app::Context;
use axum::Router;
use axum::routing::{delete, get, post};

pub fn routes() -> Router<Context> {
    Router::new()
        .route("/get-all", get(handler::get_all))
        .route("/create", post(handler::create))
        .route("/delete/{tag}", delete(handler::delete))
}
