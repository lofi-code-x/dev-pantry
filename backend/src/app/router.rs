use axum::{http::{header, HeaderValue, Method}, Router};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use crate::api;
use crate::app::context::Context;

pub fn build_router(ctx: Context) -> Router {
    let cors = CorsLayer::new()
        .allow_origin([
            "http://localhost:3000".parse::<HeaderValue>().unwrap(),
            "http://127.0.0.1:3000".parse::<HeaderValue>().unwrap(),
        ])
        .allow_credentials(true)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION, header::ACCEPT]);

    Router::new()
        .nest("/api", api::routes())
        .nest_service("/uploads", ServeDir::new("uploads"))
        .layer(cors)
        .with_state(ctx)
}
