use chrono::{DateTime, Utc};

#[derive(sqlx::FromRow, serde::Serialize, Debug)]
pub struct Module {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub author: String,
    pub rating: i64,
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow, serde::Serialize)]
pub struct ModuleItem {
    pub id: i64,
    pub module_id: i64,
    pub post_id: i64,
    pub section_id: Option<i64>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow, serde::Serialize)]
pub struct ModuleSection {
    pub id: i64,
    pub module_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
pub struct PostWithSection {
    pub section_id: Option<i64>,
    pub id: i64,
    pub title: String,
    pub category_tag: String,
    pub content_markdown: String,
    pub preview_text: String,
    pub author: String,
    pub rating: i64,
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
