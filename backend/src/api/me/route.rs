use crate::api::me::handler;
use crate::app::Context;
use axum::{
    Router,
    routing::{delete, get, post},
};

pub fn routes() -> Router<Context> {
    Router::new()
        .nest("/bookmarks", bookmarks_routes())
        .route("/post-state/{post_id}", get(handler::get_post_state))
        .nest("/reads", reads_routes())
        .nest("/modules", modules_routes())
}

fn bookmarks_routes() -> Router<Context> {
    Router::new()
        .route(
            "/",
            get(handler::list_bookmarks).post(handler::add_bookmark),
        )
        .route("/{post_id}", delete(handler::remove_bookmark))
}

fn reads_routes() -> Router<Context> {
    Router::new().route("/", get(handler::list_reads)).route(
        "/complete/{post_id}",
        post(handler::mark_read_completed).delete(handler::uncomplete_read),
    )
}

fn modules_routes() -> Router<Context> {
    Router::new()
        .route("/progress", get(handler::list_module_progress))
}
