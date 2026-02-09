# ---- build ----
FROM rust:1-bookworm AS build
WORKDIR /app

COPY Cargo.toml Cargo.lock ./
RUN mkdir -p src && echo "fn main(){}" > src/main.rs
RUN cargo build --release || true

COPY . .
RUN cargo build --release

# ---- run ----
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=build /app/target/release/backend /app/backend

ENV APP_ENV=prod
ENV SERVER_PORT=3001
EXPOSE 3001
CMD ["/app/backend"]
