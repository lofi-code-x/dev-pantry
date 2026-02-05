use crate::api::leaderboard::handler;
use crate::app::Context;
use axum::Router;
use axum::routing::get;

pub fn routes() -> Router<Context> {
    Router::new().route("/", get(handler::get_leaderboard))
}
