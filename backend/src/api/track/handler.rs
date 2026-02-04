use crate::api::error::ApiError;
use crate::app::Context;
use crate::auth::jwt::decode_jwt;
use crate::domain::analytics::service;
use axum::extract::State;
use axum::http::{header, HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use uuid::Uuid;

const VISITOR_COOKIE: &str = "sf_vid";
const COOKIE_MAX_AGE: i64 = 60 * 60 * 24 * 365; // 1 year

#[derive(serde::Deserialize)]
pub struct PageviewBody {
    pub path: String,
}

pub async fn pageview(
    State(ctx): State<Context>,
    headers: HeaderMap,
    Json(body): Json<PageviewBody>,
) -> Result<Response, ApiError> {
    let (visitor_id, set_cookie) = get_or_create_visitor_id(&headers);
    let user_id = extract_user_id(&ctx, &headers);

    let path = body.path.trim();
    if !path.is_empty() && is_trackable_path(path) {
        let ua = headers.get(header::USER_AGENT).and_then(|v| v.to_str().ok());
        // best-effort logging
        let _ = service::log_pageview(&ctx.pool, visitor_id, user_id, path, ua).await;
    }

    let mut response = StatusCode::NO_CONTENT.into_response();
    if let Some(cookie) = set_cookie {
        response.headers_mut().append(header::SET_COOKIE, cookie);
    }
    Ok(response)
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
