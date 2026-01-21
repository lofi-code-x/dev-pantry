use crate::api::error::ApiError;
use crate::app::Context;
use crate::auth::jwt::decode_jwt;
use crate::domain::user;
use crate::domain::user::model::{User, UserRole};
use axum::{
    extract::{FromRef, FromRequestParts},
    http::{header, request::Parts},
};

pub struct CurrentUser(pub User);

impl<C> FromRequestParts<C> for CurrentUser
where
    C: Send + Sync,
    Context: FromRef<C>,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, ctx: &C) -> Result<Self, Self::Rejection> {
        let ctx = Context::from_ref(ctx);

        let auth_header = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .ok_or_else(ApiError::unauthorized)?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or_else(ApiError::unauthorized)?;

        let claims = decode_jwt(token, &ctx.jwt_keys).map_err(|_| ApiError::unauthorized())?;

        let user = user::repo::select_by_id(&ctx.pool, claims.sub)
            .await
            .map_err(ApiError::internal)?;

        Ok(CurrentUser(user))
    }
}

pub struct StaffUser(pub User);

impl StaffUser {
    fn allowed(role: &UserRole) -> bool {
        matches!(
            role,
            UserRole::Admin | UserRole::Moderator | UserRole::Editor
        )
    }
}

impl<S> FromRequestParts<S> for StaffUser
where
    S: Send + Sync,
    Context: FromRef<S>,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let CurrentUser(user) = CurrentUser::from_request_parts(parts, state).await?;
        if !Self::allowed(&user.role) {
            return Err(ApiError::forbidden());
        }
        Ok(StaffUser(user))
    }
}

// pub struct Admin(pub User);
//
// impl<C> FromRequestParts<C> for Admin
// where
//     C: Send + Sync,
//     Context: FromRef<C>,
// {
//     type Rejection = ApiError;
//
//     async fn from_request_parts(parts: &mut Parts, ctx: &C) -> Result<Self, Self::Rejection> {
//         let CurrentUser(user) = CurrentUser::from_request_parts(parts, ctx).await?;
//
//         if user.role != UserRole::Admin {
//             return Err(ApiError::forbidden());
//         }
//
//         Ok(Admin(user))
//     }
// }
//
// pub struct Moderator(pub User);
//
// impl<C> FromRequestParts<C> for Moderator
// where
//     C: Send + Sync,
//     Context: FromRef<C>,
// {
//     type Rejection = ApiError;
//
//     async fn from_request_parts(parts: &mut Parts, ctx: &C) -> Result<Self, Self::Rejection> {
//         let CurrentUser(user) = CurrentUser::from_request_parts(parts, ctx).await?;
//
//         if user.role != UserRole::Moderator {
//             return Err(ApiError::forbidden());
//         }
//
//         Ok(Moderator(user))
//     }
// }
//
// pub struct Editor(pub User);
//
// impl<C> FromRequestParts<C> for Editor
// where
//     C: Send + Sync,
//     Context: FromRef<C>,
// {
//     type Rejection = ApiError;
//
//     async fn from_request_parts(parts: &mut Parts, ctx: &C) -> Result<Self, Self::Rejection> {
//         let CurrentUser(user) = CurrentUser::from_request_parts(parts, ctx).await?;
//
//         if user.role != UserRole::Editor {
//             return Err(ApiError::forbidden());
//         }
//
//         Ok(Editor(user))
//     }
// }
