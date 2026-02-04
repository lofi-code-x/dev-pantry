use crate::api::leaderboard::handler;
use crate::app::Context;
use axum::routing::get;
use axum::Router;

pub fn routes() -> Router<Context> {
    Router::new().route("/", get(handler::get_leaderboard))
}
