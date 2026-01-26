use serde::Serialize;
use sqlx::FromRow;

#[derive(Serialize, FromRow)]
pub struct Category {
    pub tag: String,
    pub title: String,
}
