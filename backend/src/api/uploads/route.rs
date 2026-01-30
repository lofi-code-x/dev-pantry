use crate::api::uploads::handler::{
    list_images, list_module_images, list_module_images_batch, upload_image,
};
use crate::app::Context;
use axum::Router;
use axum::routing::{get, post};

pub fn routes() -> Router<Context> {
    Router::new()
        // posts
        .route("/images", post(upload_image))
        .route("/images/{post_id}", get(list_images))
        // ✅ modules
        .route("/modules/{module_id}/images", get(list_module_images))
        .route("/modules/images", get(list_module_images_batch))
}
