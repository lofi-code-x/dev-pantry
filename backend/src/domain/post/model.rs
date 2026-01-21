use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;

#[derive(Serialize, FromRow)]
pub struct Post {
    pub id: i64,
    pub title: String,
    pub content_markdown: String,
    pub preview_text: String,
    pub category_tag: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub author: String,
    pub rating: i64,
    pub is_published: bool,
}
