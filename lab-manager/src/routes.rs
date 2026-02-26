use crate::{
    auth::User,
    config::Config,
    docker::Docker,
    model::{CreateSessionRequest, CreateSessionResponse, SessionState, SessionStatusResponse},
    store::SessionStore,
};
use axum::{
    extract::{FromRef, Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    pub cfg: Config,
    pub store: Arc<SessionStore>,
    pub docker: Arc<Docker>,
    pub create_session_lock: Arc<Mutex<()>>,
}

impl FromRef<AppState> for Config {
    fn from_ref(input: &AppState) -> Self {
        input.cfg.clone()
    }
}

pub fn router(state: AppState) -> axum::Router {
    axum::Router::new()
        .route("/healthz", axum::routing::get(healthz))
        .route("/readyz", axum::routing::get(readyz))
        .route("/lab/sessions", axum::routing::post(create_session))
        .route("/lab/sessions/{id}", axum::routing::get(get_session))
        .route("/lab/sessions/{id}", axum::routing::delete(delete_session))
        .route(
            "/lab/sessions/{id}/heartbeat",
            axum::routing::post(heartbeat_session),
        )
        .with_state(state)
}

async fn create_session(
    State(st): State<AppState>,
    user: User,
    Json(req): Json<CreateSessionRequest>,
) -> Result<(StatusCode, Json<CreateSessionResponse>), (StatusCode, String)> {
    let _create_guard = st.create_session_lock.lock().await;

    if let Some(kind) = req.kind.as_deref() {
        tracing::info!(user=%user.id, kind=%kind, "create session");
    }

    // 1) если у юзера уже есть активная — возвращаем её (удобно для фронта)
    if let Some(existing) = st.store.find_running_for_user(&user.id).await {
        return Ok((
            StatusCode::OK,
            Json(CreateSessionResponse {
                session_id: existing.id,
                expires_at: existing.expires_at,
            }),
        ));
    }

    // 2) лимиты
    let global = st.store.count_running().await;
    if global >= st.store.cfg().max_sessions_global {
        return Err((StatusCode::SERVICE_UNAVAILABLE, "server busy".into()));
    }

    let per_user = st.store.count_running_for_user(&user.id).await;
    if per_user >= st.store.cfg().max_sessions_per_user {
        return Err((
            StatusCode::TOO_MANY_REQUESTS,
            "too many sessions for user".into(),
        ));
    }

    // 3) резервируем session_id заранее, чтобы имя контейнера было стабильным
    let session_id = Uuid::new_v4();
    let container_name = st.docker.container_name(&session_id);

    // 4) создаём контейнер
    st.docker
        .create_container(&container_name)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("docker: {e}")))?;

    // 5) пишем в store тем же session_id
    let session = st
        .store
        .insert_running_with_id(session_id, user.id.clone(), container_name.clone())
        .await;

    Ok((
        StatusCode::CREATED,
        Json(CreateSessionResponse {
            session_id: session.id,
            expires_at: session.expires_at,
        }),
    ))
}

async fn get_session(
    State(st): State<AppState>,
    user: User,
    Path(id): Path<Uuid>,
) -> Result<Json<SessionStatusResponse>, (StatusCode, String)> {
    let s = st
        .store
        .get(id)
        .await
        .ok_or((StatusCode::NOT_FOUND, "not found".into()))?;

    if s.user_id != user.id {
        return Err((StatusCode::FORBIDDEN, "forbidden".into()));
    }

    // Пуллинг статуса с фронта можно считать активностью.
    let _ = st.store.touch_activity(id).await;

    Ok(Json(SessionStatusResponse { session: s }))
}

async fn delete_session(
    State(st): State<AppState>,
    user: User,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let s = st
        .store
        .get(id)
        .await
        .ok_or((StatusCode::NOT_FOUND, "not found".into()))?;

    if s.user_id != user.id {
        return Err((StatusCode::FORBIDDEN, "forbidden".into()));
    }

    st.docker
        .kill_container(&s.container_name)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("docker kill: {e}"),
            )
        })?;
    st.docker
        .remove_container(&s.container_name)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("docker rm: {e}")))?;

    let _ = st.store.mark_stopped(id, SessionState::Stopped).await;
    let _ = st.store.remove(id).await;

    Ok(StatusCode::NO_CONTENT)
}

async fn heartbeat_session(
    State(st): State<AppState>,
    user: User,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let s = st
        .store
        .get(id)
        .await
        .ok_or((StatusCode::NOT_FOUND, "not found".into()))?;

    if s.user_id != user.id {
        return Err((StatusCode::FORBIDDEN, "forbidden".into()));
    }

    st.store.touch_activity(id).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("touch activity: {e}"),
        )
    })?;

    Ok(StatusCode::NO_CONTENT)
}

async fn healthz() -> StatusCode {
    StatusCode::OK
}

async fn readyz(State(st): State<AppState>) -> StatusCode {
    match st.docker.ping().await {
        Ok(()) => StatusCode::OK,
        Err(e) => {
            tracing::warn!("readyz failed: {e}");
            StatusCode::SERVICE_UNAVAILABLE
        }
    }
}
