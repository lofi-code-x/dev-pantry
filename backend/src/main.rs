use backend::app;
use backend::app::Context;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().init();

    let ctx = Context::new().await.expect("Unable to create context");
    let router = app::build_router(ctx);

    app::serve(router, "0.0.0.0:8000")
        .await
        .expect("Unable to start server");
}
