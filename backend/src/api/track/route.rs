use crate::api::track::handler;
use crate::app::Context;
use axum::routing::post;
use axum::Router;

pub fn routes() -> Router<Context> {
    Router::new().route("/pageview", post(handler::pageview))
}
