use crate::api::admin::handler;
use crate::app::Context;
use axum::routing::{delete, get, put};
use axum::Router;

pub fn routes() -> Router<Context> {
    Router::new()
        .route("/users", get(handler::list_users))
        .route("/users/{user_id}", delete(handler::delete_user))
        .route("/users/{user_id}/role", put(handler::update_user_role))
}
