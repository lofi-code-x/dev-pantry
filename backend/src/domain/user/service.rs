use crate::app::Context;
use crate::auth::crypt::verify;
use crate::auth::jwt::create_jwt;
use crate::domain::user::dto::{
    AdminUserListItem, AdminUserListResponse, AuthResponse, LoginRequest, PublicUserContacts,
    PublicUserProfile, PublicUserStats,
};
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

pub async fn get_public_profile(ctx: &Context, login: &str) -> error::Result<PublicUserProfile> {
    let row = repo::select_public_profile_by_login(&ctx.pool, login).await?;
    let row = row.ok_or_else(|| error::Error::NotFound("User not found".to_string()))?;

    Ok(PublicUserProfile {
        login: row.login,
        role: row.role,
        avatar_url: row.avatar_key.map(|k| format!("/uploads/{}", k)),
        contacts: PublicUserContacts {
            email: row.email,
            website: row.website,
            github: row.github,
            telegram: row.telegram,
        },
        stats: PublicUserStats {
            total_xp: row.total_xp,
            posts_completed: row.posts_completed,
            modules_completed: row.modules_completed,
        },
    })
}

pub async fn list_users_admin(
    ctx: &Context,
    page: i64,
    limit: i64,
    q: Option<String>,
) -> error::Result<AdminUserListResponse> {
    if page < 1 {
        return Err(error::Error::BadRequest("page must be >= 1".to_string()));
    }
    if !(1..=100).contains(&limit) {
        return Err(error::Error::BadRequest(
            "limit must be between 1 and 100".to_string(),
        ));
    }

    let offset = (page - 1) * limit;
    let q = q.map(|s| s.trim().to_string()).filter(|s| !s.is_empty());

    let (total, rows) = if let Some(ref query) = q {
        let total = repo::count_users_filtered(&ctx.pool, query).await?;
        let rows = repo::list_users_page_filtered(&ctx.pool, query, limit, offset).await?;
        (total, rows)
    } else {
        let total = repo::count_users(&ctx.pool).await?;
        let rows = repo::list_users_page(&ctx.pool, limit, offset).await?;
        (total, rows)
    };

    let items = rows
        .into_iter()
        .map(|r| AdminUserListItem {
            id: r.id,
            login: r.login,
            role: r.role,
            created_at: r.created_at,
            avatar_url: r.avatar_key.map(|k| format!("/uploads/{}", k)),
        })
        .collect();

    Ok(AdminUserListResponse {
        items,
        page,
        limit,
        total,
    })
}

pub async fn update_user_role_admin(
    ctx: &Context,
    user_id: i64,
    role: UserRole,
) -> error::Result<()> {
    if role == UserRole::Admin {
        return Err(error::Error::BadRequest(
            "assigning admin role is not allowed".to_string(),
        ));
    }

    let user = repo::select_by_id(&ctx.pool, user_id)
        .await
        .map_err(|e| match e {
            error::Error::Sqlx(sqlx::Error::RowNotFound) => {
                error::Error::NotFound(format!("User {} not found", user_id))
            }
            other => other,
        })?;

    if user.role == UserRole::Admin {
        return Err(error::Error::BadRequest(
            "changing admin role is not allowed".to_string(),
        ));
    }

    let rows = repo::update_user_role(&ctx.pool, user_id, role).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!(
            "User {} not found",
            user_id
        )));
    }
    Ok(())
}

pub async fn delete_user_admin(ctx: &Context, user_id: i64) -> error::Result<()> {
    let user = repo::select_by_id(&ctx.pool, user_id)
        .await
        .map_err(|e| match e {
            error::Error::Sqlx(sqlx::Error::RowNotFound) => {
                error::Error::NotFound(format!("User {} not found", user_id))
            }
            other => other,
        })?;

    if user.role == UserRole::Admin {
        return Err(error::Error::BadRequest(
            "deleting admin users is not allowed".to_string(),
        ));
    }

    let rows = repo::delete_user(&ctx.pool, user_id).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!(
            "User {} not found",
            user_id
        )));
    }
    Ok(())
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
