use crate::api::meta::handler;
use crate::app::Context;
use axum::Router;
use axum::routing::get;

pub fn routes() -> Router<Context> {
    Router::new().route("/version", get(handler::version))
}
