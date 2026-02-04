use crate::api::{admin, category, leaderboard, me, meta, module, post, uploads, user};
use crate::app::Context;
use axum::Router;

pub fn routes() -> Router<Context> {
    Router::new()
        .nest("/auth", user::routes())
        .nest("/user", user::public_routes())
        .nest("/admin", admin::routes())
        .nest("/leaderboard", leaderboard::routes())
        .nest("/category", category::routes())
        .nest("/post", post::routes())
        .nest("/uploads", uploads::routes())
        .nest("/module", module::routes())
        .nest("/me", me::routes())
        .nest("/meta", meta::routes())
}
