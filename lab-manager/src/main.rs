mod auth;
mod cleanup;
mod config;
mod docker;
mod model;
mod routes;
mod store;

use crate::{
    cleanup::spawn_cleanup_loop, config::Config, docker::Docker, routes::AppState,
    store::SessionStore,
};
use axum::http::{HeaderValue, Method};
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::{
    cors::{AllowOrigin, Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let cfg = Config::from_env();

    let store = Arc::new(SessionStore::new(cfg.clone()));
    let docker = Arc::new(Docker::new(cfg.clone()));

    if cfg.startup_cleanup_managed_containers {
        match docker.cleanup_managed_containers_on_startup().await {
            Ok(0) => tracing::info!("startup cleanup: no managed containers found"),
            Ok(n) => tracing::info!(count = n, "startup cleanup: removed managed containers"),
            Err(e) => tracing::warn!("startup cleanup failed: {e}"),
        }
    }

    spawn_cleanup_loop(store.clone(), docker.clone());

    let state = AppState {
        cfg: cfg.clone(),
        store,
        docker,
        create_session_lock: Arc::new(Mutex::new(())),
    };

    let cors = if cfg.cors_allow_origins.len() == 1 && cfg.cors_allow_origins[0] == "*" {
        tracing::warn!(
            "CORS_ALLOW_ORIGINS=* enables wildcard CORS; use only in trusted/dev environments"
        );
        CorsLayer::new()
            .allow_methods([Method::GET, Method::POST, Method::DELETE])
            .allow_headers(Any)
            .allow_origin(Any)
    } else {
        let origins = cfg
            .cors_allow_origins
            .iter()
            .map(|v| HeaderValue::from_str(v))
            .collect::<Result<Vec<_>, _>>()?;

        CorsLayer::new()
            .allow_methods([Method::GET, Method::POST, Method::DELETE])
            .allow_headers(Any)
            .allow_origin(AllowOrigin::list(origins))
    };

    let app = routes::router(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    let listener = tokio::net::TcpListener::bind(&cfg.bind_addr).await?;
    tracing::info!("lab-manager listening on {}", cfg.bind_addr);
    log_runtime_identity().await;

    axum::serve(listener, app).await?;
    Ok(())
}

use tokio::process::Command;

async fn log_runtime_identity() {
    let id_out = Command::new("id").arg("-a").output().await;
    if let Ok(out) = id_out {
        tracing::info!("id -a: {}", String::from_utf8_lossy(&out.stdout).trim());
        if !out.status.success() {
            tracing::warn!("id stderr: {}", String::from_utf8_lossy(&out.stderr).trim());
        }
    }

    let sock_out = Command::new("ls")
        .arg("-l")
        .arg("/var/run/docker.sock")
        .output()
        .await;

    if let Ok(out) = sock_out {
        tracing::info!(
            "docker.sock: {}",
            String::from_utf8_lossy(&out.stdout).trim()
        );
        if !out.status.success() {
            tracing::warn!("ls stderr: {}", String::from_utf8_lossy(&out.stderr).trim());
        }
    }

    let docker_ver = Command::new("docker").arg("version").output().await;
    if let Ok(out) = docker_ver {
        tracing::info!("docker version rc={}", out.status);
        if !out.status.success() {
            tracing::warn!("docker version stderr: {}", String::from_utf8_lossy(&out.stderr).trim());
        }
    }
}
//77415408-1c57-4e85-b270-3e1e104b1d04
/*

создать сессию

curl -i -X POST http://localhost:3010/lab/sessions \
  -H 'content-type: application/json' \
  -H 'x-user-id: u1' \
  -d '{}'


статус

curl -s http://localhost:3010/lab/sessions/<UUID> -H 'x-user-id: u1' | jq


удалить

curl -i -X DELETE http://localhost:3010/lab/sessions/<UUID> -H 'x-user-id: u1'

 */