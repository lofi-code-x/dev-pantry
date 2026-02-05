use crate::api::error::ApiError;
use crate::app::Context;
use crate::auth::jwt::decode_jwt;
use crate::domain::user;
use crate::domain::user::model::{User, UserRole};

use axum::{
    extract::{FromRef, FromRequestParts},
    http::{header, request::Parts},
};

pub enum Client {
    Staff(User),
    User(User),
    Anonymous,
}

impl Client {
    pub fn require_user(&self) -> Result<&User, ApiError> {
        match self {
            Client::Staff(u) | Client::User(u) => Ok(u),
            Client::Anonymous => Err(ApiError::unauthorized()),
        }
    }

    pub fn require_staff(&self) -> Result<&User, ApiError> {
        match self {
            Client::Staff(u) => Ok(u),
            Client::User(_) => Err(ApiError::forbidden()),
            Client::Anonymous => Err(ApiError::unauthorized()),
        }
    }

    pub fn is_staff(&self) -> bool {
        self.require_staff().is_ok()
    }

    pub fn is_admin(&self) -> bool {
        matches!(self, Client::Staff(u) if u.role == UserRole::Admin)
    }
}

impl<C> FromRequestParts<C> for Client
where
    C: Send + Sync,
    Context: FromRef<C>,
{
    type Rejection = ApiError;

    fn from_request_parts(
        parts: &mut Parts,
        state: &C,
    ) -> impl Future<Output = Result<Self, Self::Rejection>> + Send {
        let ctx = Context::from_ref(state);

        async move {
            let user_opt = auth_user_or_error(&ctx, parts).await?;

            let Some(u) = user_opt else {
                return Ok(Client::Anonymous);
            };

            match &u.role {
                UserRole::Admin | UserRole::Moderator | UserRole::Editor => Ok(Client::Staff(u)),
                UserRole::User => Ok(Client::User(u)),
            }
        }
    }
}

/// Возвращает:
/// - Ok(None): заголовка Authorization нет => Anonymous
/// - Ok(Some(token)): Bearer token извлечён
/// - Err: заголовок есть, но кривой формат => unauthorized
fn bearer_token_optional_strict(parts: &Parts) -> Result<Option<&str>, ApiError> {
    let Some(hv) = parts.headers.get(header::AUTHORIZATION) else {
        return Ok(None);
    };

    let auth = hv.to_str().map_err(|_| ApiError::unauthorized())?;
    let auth = auth.trim();

    if auth.is_empty() {
        return Err(ApiError::unauthorized());
    }

    let token = auth
        .strip_prefix("Bearer ")
        .ok_or_else(ApiError::unauthorized)?
        .trim();

    if token.is_empty() {
        return Err(ApiError::unauthorized());
    }

    Ok(Some(token))
}

async fn auth_user_or_error(ctx: &Context, parts: &Parts) -> Result<Option<User>, ApiError> {
    let Some(token) = bearer_token_optional_strict(parts)? else {
        return Ok(None);
    };

    let claims = decode_jwt(token, &ctx.jwt_keys).map_err(|_| ApiError::unauthorized())?;

    match user::repo::select_by_id(&ctx.pool, claims.sub).await {
        Ok(u) => Ok(Some(u)),
        Err(e) => match e {
            crate::error::Error::Sqlx(sqlx::Error::RowNotFound) => Err(ApiError::unauthorized()),
            other => Err(ApiError::internal(other)),
        },
    }
}
