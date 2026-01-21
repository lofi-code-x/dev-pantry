use crate::api::{category, post, user};
use crate::app::Context;
use axum::Router;

pub fn routes() -> Router<Context> {
    Router::new()
        .nest("/auth", user::routes())
        .nest("/category", category::routes())
        .nest("/post", post::routes())

    // .nest("/links", links::routes())
    // .nest("/uploads", uploads::routes())
    // .nest("/modules", modules::module_routes())
    // .nest("/module-items", modules::item_routes())
    // // --- me ---
    // .nest("/me", me::routes())
    // .nest("/me/bookmarks", me::me_bookmark_routes())
    // .nest("/me/reads", me::me_read_routes())
    // .nest("/me/ratings", me::me_rating_routes())
    // .nest("/me/post-state", me::me_post_state_routes())
    // // module progress (старый ручной, если хочешь оставить)
    // .nest("/me/modules", me::me_module_routes())
    // // computed progress: GET /me/modules/progress
    // .nest("/me/modules", me::me_module_progress_routes())
    // // ✅ module bookmarks (saved modules)
    // .nest("/me/module-bookmarks", me::me_module_bookmark_routes())
}
