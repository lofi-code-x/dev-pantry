use crate::api::error::ApiError;
use crate::app::Context;
use crate::auth::jwt::decode_jwt;
use crate::domain::analytics::service;
use axum::Json;
use axum::extract::State;
use axum::http::{HeaderMap, HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
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
        let ua = headers
            .get(header::USER_AGENT)
            .and_then(|v| v.to_str().ok());
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
    let existing = headers
        .get(header::COOKIE)
        .and_then(|v| v.to_str().ok())
        .and_then(|cookie_header| get_cookie_value(cookie_header, VISITOR_COOKIE))
        .and_then(|val| Uuid::parse_str(val).ok());

    if let Some(id) = existing {
        return (id, None);
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
    cookie_header.split(';').map(|c| c.trim()).find_map(|pair| {
        let mut it = pair.splitn(2, '=');
        let k = it.next()?.trim();
        let v = it.next()?.trim();
        if k == name { Some(v) } else { None }
    })
}

fn is_trackable_path(raw: &str) -> bool {
    // 1) trim + normalize (drop query + fragment)
    let s = raw.trim();
    if s.is_empty() {
        return false;
    }

    let path = s
        .split_once('#')
        .map(|(p, _)| p)
        .unwrap_or(s)
        .split_once('?')
        .map(|(p, _)| p)
        .unwrap_or(s)
        .trim();

    if path.is_empty() {
        return false;
    }

    // For now: require absolute-path.
    if !path.starts_with('/') {
        return false;
    }

    // 2) common non-page prefixes
    if path.starts_with("/api") {
        return false;
    }
    if path.starts_with("/uploads") {
        return false;
    }
    if path.starts_with("/_next") {
        return false;
    }

    // 3) exact excludes (well-known files)
    match path {
        "/favicon.ico"
        | "/robots.txt"
        | "/sitemap.xml"
        | "/sitemap_index.xml"
        | "/manifest.json"
        | "/site.webmanifest"
        | "/apple-touch-icon.png"
        | "/browserconfig.xml" => return false,
        _ => {}
    }

    // 4) extension-based excludes (static assets)
    // Ignore last path segment extension.
    let last = path.rsplit('/').next().unwrap_or(path);

    // If segment has a dot, treat it as a file extension candidate
    if let Some((_, ext)) = last.rsplit_once('.') {
        // ext in lowercase for matching
        let ext = ext.to_ascii_lowercase();
        if matches!(
            ext.as_str(),
            // images
            "png" | "jpg" | "jpeg" | "webp" | "gif" | "svg" | "ico" | "avif" |
            // styles/scripts
            "css" | "js" | "mjs" | "cjs" |
            // source maps
            "map" |
            // fonts
            "woff" | "woff2" | "ttf" | "otf" | "eot" |
            // docs/data
            "pdf" | "txt" | "xml" | "json" |
            // media
            "mp4" | "webm" | "mp3" | "wav" | "ogg" |
            // archives
            "zip" | "gz" | "tgz" | "bz2" | "7z"
        ) {
            return false;
        }
    }

    // 5) optional: ignore trailing slash normalization issues
    // (usually fine to track both /learn and /learn/ as same, but this keeps it permissive)

    true
}
