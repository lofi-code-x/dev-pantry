use axum::Json;

#[derive(serde::Serialize)]
pub struct VersionResponse {
    version: &'static str,
}

pub async fn version() -> Json<VersionResponse> {
    Json(VersionResponse {
        version: env!("CARGO_PKG_VERSION"),
    })
}
