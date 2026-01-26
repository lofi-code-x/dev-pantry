// src/api/module/routes.rs
use axum::{
    Router,
    routing::{delete, get, post, put},
};

use crate::api::module::handler;
use crate::app::Context;

pub fn routes() -> Router<Context> {
    Router::new()
        .route("/list", get(handler::list))
        .route("/get/{id}", get(handler::get))
        .route("/create", post(handler::create))
        .route("/update/{id}", put(handler::update))
        .route("/set-public/{id}", put(handler::set_public))
        .route("/delete/{id}", delete(handler::delete))
        .route("/get-posts/{id}", get(handler::get_posts))
        .route("/{id}/items", get(handler::list_items))
        .route("/item/create", post(handler::create_item))
        .route("/item/update/{id}", put(handler::update_item))
        .route("/item/delete/{id}", delete(handler::delete_item))
}
