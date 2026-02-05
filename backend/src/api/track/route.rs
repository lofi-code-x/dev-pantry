use crate::api::track::handler;
use crate::app::Context;
use axum::Router;
use axum::routing::post;

pub fn routes() -> Router<Context> {
    Router::new().route("/pageview", post(handler::pageview))
}
