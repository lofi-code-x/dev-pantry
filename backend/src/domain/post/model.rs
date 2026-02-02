use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
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

#[derive(Serialize, FromRow)]
pub struct PostQuizQuestion {
    pub id: i64,
    pub post_id: i64,
    pub question_text: String,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize, FromRow)]
pub struct PostQuizOption {
    pub id: i64,
    pub question_id: i64,
    pub option_text: String,
    pub is_correct: bool,
}

#[derive(Serialize, Deserialize, FromRow)]
pub struct QuizAnswer {
    pub question_id: i64,
    pub option_id: i64,
}
