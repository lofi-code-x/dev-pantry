use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub bind_addr: String,
    pub cors_allow_origins: Vec<String>,

    pub lab_image: String,
    pub auth_shared_secret: Option<String>,

    pub max_sessions_global: usize,
    pub max_sessions_per_user: usize,

    pub session_ttl_secs: i64,
    pub idle_ttl_secs: i64,

    pub container_memory: String,
    pub container_cpus: String,
    pub container_pids: u32,
    pub container_network: String,
    pub container_user: String,
    pub startup_cleanup_managed_containers: bool,
}

impl Config {
    pub fn from_env() -> Self {
        let bind_addr = env::var("LAB_BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:3010".into());
        let cors_allow_origins = env::var("CORS_ALLOW_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:3000,http://127.0.0.1:3000".into())
            .split(',')
            .map(str::trim)
            .filter(|v| !v.is_empty())
            .map(ToOwned::to_owned)
            .collect::<Vec<_>>();

        let lab_image = env::var("LAB_IMAGE").unwrap_or_else(|_| "lab-image:latest".into());
        let auth_shared_secret = env::var("AUTH_SHARED_SECRET")
            .ok()
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty());

        let max_sessions_global = env::var("MAX_SESSIONS_GLOBAL")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(6);

        let max_sessions_per_user = env::var("MAX_SESSIONS_PER_USER")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(1);

        let session_ttl_secs = env::var("SESSION_TTL_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(1800);

        let idle_ttl_secs = env::var("IDLE_TTL_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(600);

        let container_memory = env::var("CONTAINER_MEMORY").unwrap_or_else(|_| "192m".into());
        let container_cpus = env::var("CONTAINER_CPUS").unwrap_or_else(|_| "0.25".into());

        let container_pids = env::var("CONTAINER_PIDS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(128);

        let container_network = env::var("CONTAINER_NETWORK").unwrap_or_else(|_| "none".into());
        let container_user = env::var("CONTAINER_USER").unwrap_or_else(|_| "1000:1000".into());
        let startup_cleanup_managed_containers = env::var("STARTUP_CLEANUP_MANAGED_CONTAINERS")
            .ok()
            .map(|v| {
                matches!(
                    v.trim().to_ascii_lowercase().as_str(),
                    "1" | "true" | "yes" | "on"
                )
            })
            .unwrap_or(true);

        Self {
            bind_addr,
            cors_allow_origins,
            lab_image,
            auth_shared_secret,
            max_sessions_global,
            max_sessions_per_user,
            session_ttl_secs,
            idle_ttl_secs,
            container_memory,
            container_cpus,
            container_pids,
            container_network,
            container_user,
            startup_cleanup_managed_containers,
        }
    }
}
