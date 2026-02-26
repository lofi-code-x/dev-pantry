use crate::config::Config;
use crate::model::{Session, SessionState};
use anyhow::Context;
use chrono::{Duration, Utc};
use std::collections::HashMap;
use tokio::sync::RwLock;
use uuid::Uuid;

pub struct SessionStore {
    cfg: Config,
    inner: RwLock<HashMap<Uuid, Session>>,
}

impl SessionStore {
    pub fn new(cfg: Config) -> Self {
        Self {
            cfg,
            inner: RwLock::new(HashMap::new()),
        }
    }

    pub fn cfg(&self) -> &Config {
        &self.cfg
    }

    pub async fn count_running(&self) -> usize {
        let m = self.inner.read().await;
        m.values()
            .filter(|s| matches!(s.state, SessionState::Running))
            .count()
    }

    pub async fn count_running_for_user(&self, user_id: &str) -> usize {
        let m = self.inner.read().await;
        m.values()
            .filter(|s| s.user_id == user_id && matches!(s.state, SessionState::Running))
            .count()
    }

    pub async fn find_running_for_user(&self, user_id: &str) -> Option<Session> {
        let m = self.inner.read().await;
        m.values()
            .find(|s| s.user_id == user_id && matches!(s.state, SessionState::Running))
            .cloned()
    }

    pub async fn insert_running_with_id(
        &self,
        id: Uuid,
        user_id: String,
        container_name: String,
    ) -> Session {
        let now = Utc::now();
        let expires_at = now + Duration::seconds(self.cfg.session_ttl_secs);

        let session = Session {
            id,
            user_id,
            container_name,
            created_at: now,
            expires_at,
            last_activity_at: now,
            state: SessionState::Running,
        };

        let mut m = self.inner.write().await;
        m.insert(session.id, session.clone());
        session
    }

    pub async fn get(&self, id: Uuid) -> Option<Session> {
        let m = self.inner.read().await;
        m.get(&id).cloned()
    }

    pub async fn touch_activity(&self, id: Uuid) -> anyhow::Result<()> {
        let mut m = self.inner.write().await;
        let s = m.get_mut(&id).context("session not found")?;
        s.last_activity_at = Utc::now();
        Ok(())
    }

    pub async fn mark_stopped(&self, id: Uuid, state: SessionState) -> anyhow::Result<Session> {
        let mut m = self.inner.write().await;
        let s = m.get_mut(&id).context("session not found")?;
        s.state = state;
        Ok(s.clone())
    }

    pub async fn remove(&self, id: Uuid) -> Option<Session> {
        let mut m = self.inner.write().await;
        m.remove(&id)
    }

    pub async fn list_running(&self) -> Vec<Session> {
        let m = self.inner.read().await;
        m.values()
            .filter(|s| matches!(s.state, SessionState::Running))
            .cloned()
            .collect()
    }
}
