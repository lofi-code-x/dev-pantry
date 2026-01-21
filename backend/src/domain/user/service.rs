use crate::app::Context;
use crate::auth::crypt::verify;
use crate::auth::jwt::create_jwt;
use crate::domain::user::dto::{AuthResponse, LoginRequest};
use crate::domain::user::model::UserRole;
use crate::domain::user::repo;
use crate::{auth, error};

const LOGIN_MIN: usize = 3;
const LOGIN_MAX: usize = 254;
const PASSWORD_MIN: usize = 8;
const PASSWORD_MAX: usize = 72;

pub async fn create(ctx: &Context, req: LoginRequest) -> error::Result<AuthResponse> {
    let login = req.login.trim();
    let password = req.password.trim();
    validate_login(login)?;
    validate_password(password)?;

    let password_hash = auth::crypt::hash(password)?;
    let user = repo::insert(&ctx.pool, login, &password_hash, UserRole::User).await?;
    let token = create_jwt(ctx, user.id, &user.role)
        .map_err(|e| error::Error::JsonWebToken(e.to_string()))?;

    Ok(AuthResponse {
        token,
        user: user.into(),
    })
}

pub async fn login(ctx: &Context, req: LoginRequest) -> error::Result<AuthResponse> {
    let user = repo::select_by_login(&ctx.pool, &req.login).await?;
    verify(&req.password, &user.password_hash)?;
    let token = create_jwt(ctx, user.id, &user.role)
        .map_err(|e| error::Error::JsonWebToken(e.to_string()))?;

    Ok(AuthResponse {
        token,
        user: user.into(),
    })
}

fn validate_login(login: &str) -> error::Result<()> {
    let l = login.len();

    if !(LOGIN_MIN..=LOGIN_MAX).contains(&l) {
        return Err(error::Error::BadRequest(
            "login length must be between 3 and 254 characters".to_string(),
        ));
    }

    if login.chars().any(|c| c.is_whitespace()) {
        return Err(error::Error::BadRequest(
            "login must not contain whitespace".to_string(),
        ));
    }

    Ok(())
}

fn validate_password(password: &str) -> error::Result<()> {
    let l = password.len();

    if !(PASSWORD_MIN..=PASSWORD_MAX).contains(&l) {
        return Err(error::Error::BadRequest(
            "password length must be between 8 and 72 characters".to_string(),
        ));
    }

    if password.chars().any(|c| c.is_whitespace()) {
        return Err(error::Error::BadRequest(
            "password must not contain whitespace".to_string(),
        ));
    }

    let mut has_letter = false;
    let mut has_digit = false;

    for ch in password.chars() {
        if ch.is_alphabetic() {
            has_letter = true;
        } else if ch.is_ascii_digit() {
            has_digit = true;
        }
        if has_letter && has_digit {
            break;
        }
    }

    if !has_letter || !has_digit {
        return Err(error::Error::BadRequest(
            "password must contain at least one letter and one digit".to_string(),
        ));
    }

    Ok(())
}
