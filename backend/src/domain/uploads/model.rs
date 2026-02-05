use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(sqlx::FromRow, serde::Serialize, Debug, Clone)]
pub struct Upload {
    pub id: Uuid,
    pub key: String,
    pub content_type: String,
    pub size_bytes: i64,
    pub created_by: Option<i64>,
    pub created_at: DateTime<Utc>,
}
