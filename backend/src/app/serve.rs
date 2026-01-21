use crate::error;
use axum::Router;

pub async fn serve(app: Router, addr: &str) -> error::Result<()> {
    tracing::info!("🚀 Server running on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
