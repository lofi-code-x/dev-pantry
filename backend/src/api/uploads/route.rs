use crate::api::uploads::handler::upload_image;
use crate::app::Context;
use axum::Router;
use axum::routing::post;

pub fn routes() -> Router<Context> {
    Router::new().route("/images", post(upload_image))
}
