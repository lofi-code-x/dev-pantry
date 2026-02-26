use crate::{docker::Docker, model::SessionState, store::SessionStore};
use chrono::{Duration, Utc};
use std::sync::Arc;
use tokio::time::{sleep, Duration as TokioDuration};

pub fn spawn_cleanup_loop(store: Arc<SessionStore>, docker: Arc<Docker>) {
    tokio::spawn(async move {
        loop {
            // период
            sleep(TokioDuration::from_secs(15)).await;

            let now = Utc::now();
            let sessions = store.list_running().await;

            for s in sessions {
                // если контейнер умер сам — тоже чистим
                let running = match docker.inspect_running(&s.container_name).await {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::warn!(session=%s.id, "inspect failed: {e}");
                        true // не рубим сессию из-за transient ошибки
                    }
                };

                let expired_by_ttl = now > s.expires_at;

                let idle_ttl = Duration::seconds(store.cfg().idle_ttl_secs);
                let expired_by_idle = now.signed_duration_since(s.last_activity_at) > idle_ttl;

                if expired_by_ttl || expired_by_idle || !running {
                    tracing::info!(
                        session=%s.id,
                        container=%s.container_name,
                        ttl=%expired_by_ttl,
                        idle=%expired_by_idle,
                        running=%running,
                        "cleanup"
                    );

                    let _ = docker.kill_container(&s.container_name).await;
                    let _ = docker.remove_container(&s.container_name).await;

                    let state = if expired_by_ttl || expired_by_idle {
                        SessionState::Expired
                    } else {
                        SessionState::Stopped
                    };

                    let _ = store.mark_stopped(s.id, state).await;
                    let _ = store.remove(s.id).await;
                }
            }
        }
    });
}
