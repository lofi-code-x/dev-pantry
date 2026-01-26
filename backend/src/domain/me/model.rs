use chrono::{DateTime, Utc};

#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct BookmarkedPost {
    pub post_id: i64,
    pub title: String,
    pub preview_text: Option<String>,
    pub category_tag: String,
    pub author: String,
    pub updated_at: DateTime<Utc>,
    pub bookmarked_at: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct ProgressPost {
    pub post_id: i64,
    pub title: String,
    pub preview_text: Option<String>,
    pub category_tag: String,
    pub author: String,
    pub updated_at: DateTime<Utc>,
    pub is_completed: bool,
    pub completed_at: Option<DateTime<Utc>>,
    pub last_read_at: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct PostState {
    pub saved: bool,
    pub completed: bool,
}

#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct ModuleProgress {
    pub module_id: i64,
    pub total_posts: i64,
    pub completed_posts: i64,
    pub is_completed: bool,
}

