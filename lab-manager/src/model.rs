use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize)]
pub enum SessionState {
    Running,
    Stopped,
    Expired,
}

#[derive(Clone, Debug, Serialize)]
pub struct Session {
    pub id: Uuid,
    pub user_id: String,
    pub container_name: String,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub last_activity_at: DateTime<Utc>,
    pub state: SessionState,
}

#[derive(Debug, Deserialize)]
pub struct CreateSessionRequest {
    /// Можно расширить: тип задания, нужен ли интернет и т.д.
    pub kind: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CreateSessionResponse {
    pub session_id: Uuid,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct SessionStatusResponse {
    pub session: Session,
}
