use crate::app::Context;
use crate::config::Config;
use crate::domain::user::model::UserRole;
use chrono::{Duration, Utc};
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

pub struct JwtKeys {
    pub encoding: EncodingKey,
    pub decoding: DecodingKey,
}

impl From<&Config> for JwtKeys {
    fn from(cfg: &Config) -> JwtKeys {
        Self {
            encoding: EncodingKey::from_secret(cfg.jwt_secret.as_bytes()),
            decoding: DecodingKey::from_secret(cfg.jwt_secret.as_bytes()),
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct Claims {
    pub sub: i64,       // user.id
    pub role: UserRole, // роль пользователя
    pub exp: usize,     // epoch seconds
}

pub fn create_jwt(
    ctx: &Context,
    user_id: i64,
    role: &UserRole,
) -> jsonwebtoken::errors::Result<String> {
    let exp = (Utc::now() + Duration::days(ctx.cfg.jwt_lifetime)).timestamp() as usize;

    let claims = Claims {
        sub: user_id,
        role: role.clone(),
        exp,
    };
    jsonwebtoken::encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &ctx.jwt_keys.encoding,
    )
}

pub fn decode_jwt(token: &str, keys: &JwtKeys) -> jsonwebtoken::errors::Result<Claims> {
    let data =
        jsonwebtoken::decode::<Claims>(token, &keys.decoding, &Validation::new(Algorithm::HS256))?;
    Ok(data.claims)
}
