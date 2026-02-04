use crate::api;
use crate::app::context::Context;
use crate::auth::jwt::decode_jwt;
use crate::domain::analytics::service as analytics_service;
use axum::{
    Router,
    extract::State,
    http::{HeaderMap, HeaderValue, Method, Request, header},
    middleware::{Next, from_fn_with_state},
    response::Response,
};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use uuid::Uuid;

const VISITOR_COOKIE: &str = "sf_vid";
const COOKIE_MAX_AGE: i64 = 60 * 60 * 24 * 365;

pub fn build_router(ctx: Context) -> Router {
    let cors = CorsLayer::new()
        .allow_origin([
            "http://localhost:3000".parse::<HeaderValue>().unwrap(),
            "http://127.0.0.1:3000".parse::<HeaderValue>().unwrap(),
        ])
        .allow_credentials(true)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION, header::ACCEPT]);

    Router::new()
        .nest("/api", api::routes())
        .nest_service("/uploads", ServeDir::new("uploads"))
        .layer(from_fn_with_state(ctx.clone(), analytics_middleware))
        .layer(cors)
        .with_state(ctx)
}

async fn analytics_middleware(
    State(ctx): State<Context>,
    req: Request<axum::body::Body>,
    next: Next,
) -> Response {
    let path = req.uri().path().to_string();
    let method = req.method().clone();
    let headers = req.headers().clone();

    let response = if path.starts_with("/api") {
        next.run(req).await
    } else {
        let (visitor_id, set_cookie) = get_or_create_visitor_id(&headers);
        let user_id = extract_user_id(&ctx, &headers);
        let ua = headers.get(header::USER_AGENT).and_then(|v| v.to_str().ok());

        let response = next.run(req).await;

        if method == Method::GET && is_trackable_path(&path) {
            let _ = analytics_service::log_pageview(&ctx.pool, visitor_id, user_id, &path, ua).await;
        }

        if let Some(cookie) = set_cookie {
            let mut response = response;
            response.headers_mut().append(header::SET_COOKIE, cookie);
            response
        } else {
            response
        }
    };

    response
}

fn extract_user_id(ctx: &Context, headers: &HeaderMap) -> Option<i64> {
    let auth = headers.get(header::AUTHORIZATION)?.to_str().ok()?;
    let token = auth.strip_prefix("Bearer ")?.trim();
    if token.is_empty() {
        return None;
    }
    decode_jwt(token, &ctx.jwt_keys).ok().map(|c| c.sub)
}

fn get_or_create_visitor_id(headers: &HeaderMap) -> (Uuid, Option<HeaderValue>) {
    if let Some(cookie_header) = headers.get(header::COOKIE).and_then(|v| v.to_str().ok()) {
        if let Some(val) = get_cookie_value(cookie_header, VISITOR_COOKIE) {
            if let Ok(id) = Uuid::parse_str(val) {
                return (id, None);
            }
        }
    }

    let id = Uuid::new_v4();
    let cookie = format!(
        "{name}={value}; Path=/; Max-Age={max_age}; SameSite=Lax",
        name = VISITOR_COOKIE,
        value = id,
        max_age = COOKIE_MAX_AGE
    );
    let header = HeaderValue::from_str(&cookie).ok();
    (id, header)
}

fn get_cookie_value<'a>(cookie_header: &'a str, name: &str) -> Option<&'a str> {
    cookie_header
        .split(';')
        .map(|c| c.trim())
        .find_map(|pair| {
            let mut it = pair.splitn(2, '=');
            let k = it.next()?.trim();
            let v = it.next()?.trim();
            if k == name {
                Some(v)
            } else {
                None
            }
        })
}

fn is_trackable_path(path: &str) -> bool {
    if path.starts_with("/api") {
        return false;
    }
    if path.starts_with("/uploads") {
        return false;
    }
    if path.starts_with("/_next") {
        return false;
    }
    if path == "/favicon.ico" {
        return false;
    }
    true
}
