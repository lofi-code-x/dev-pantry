use backend::app;
use backend::app::Context;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().init();

    let ctx = Context::new().await.expect("Unable to create context");
    let addr = format!("0.0.0.0:{}", ctx.cfg.server_port);
    let router = app::build_router(ctx);

    app::serve(router, &addr)
        .await
        .expect("Unable to start server");
}
