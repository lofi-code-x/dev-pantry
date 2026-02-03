use crate::api::{category, me, meta, module, post, uploads, user};
use crate::app::Context;
use axum::Router;

pub fn routes() -> Router<Context> {
    Router::new()
        .nest("/auth", user::routes())
        .nest("/category", category::routes())
        .nest("/post", post::routes())
        .nest("/uploads", uploads::routes())
        .nest("/module", module::routes())
        .nest("/me", me::routes())
        .nest("/meta", meta::routes())
}
