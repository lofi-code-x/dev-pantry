use crate::config::Config;
use axum::{
    extract::{FromRef, FromRequestParts},
    http::{request::Parts, StatusCode},
};
use std::future::{self, Future};

#[derive(Clone, Debug)]
pub struct User {
    pub id: String,
}

impl<S> FromRequestParts<S> for User
where
    S: Send + Sync,
    Config: FromRef<S>,
{
    type Rejection = (StatusCode, String);

    fn from_request_parts(
        parts: &mut Parts,
        state: &S,
    ) -> impl Future<Output = Result<Self, Self::Rejection>> + Send {
        let cfg = Config::from_ref(state);
        let provided_auth = parts
            .headers
            .get("x-lab-auth")
            .and_then(|v| v.to_str().ok())
            .map(ToOwned::to_owned);
        let uid = parts
            .headers
            .get("x-user-id")
            .and_then(|v| v.to_str().ok())
            .map(ToOwned::to_owned);

        if let Some(expected) = cfg.auth_shared_secret.as_deref() {
            if provided_auth.as_deref() != Some(expected) {
                return future::ready(Err((StatusCode::UNAUTHORIZED, "invalid x-lab-auth".into())));
            }
        }

        let uid = match uid {
            Some(uid) => uid,
            None => {
                return future::ready(Err((StatusCode::UNAUTHORIZED, "missing x-user-id".into())))
            }
        };

        if !is_valid_user_id(&uid) {
            return future::ready(Err((StatusCode::BAD_REQUEST, "invalid x-user-id".into())));
        }

        future::ready(Ok(User { id: uid }))
    }
}

fn is_valid_user_id(uid: &str) -> bool {
    if uid.is_empty() || uid.len() > 128 {
        return false;
    }

    uid.bytes()
        .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'@' | b':' | b'/'))
}
