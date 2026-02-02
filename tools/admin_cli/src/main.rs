use argon2::password_hash::SaltString;
use argon2::password_hash::rand_core::OsRng;
use argon2::{Argon2, Params, PasswordHasher, Version};
use sqlx::postgres::PgPoolOptions;

const DATABASE_URL: &str = "postgres://admin:admin@localhost:5432/dev-pantry";

fn hash_password(password: &str) -> Result<String, Box<dyn std::error::Error>> {
    let salt = SaltString::generate(&mut OsRng);
    let params = Params::new(19 * 1024, 2, 1, None).expect("Invalid params");
    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, Version::V0x13, params);
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .expect("hash")
        .to_string();
    Ok(hash)
}

//cargo run -p admin_cli -- admin n0D4B5sXoHdQUNG

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = std::env::args().skip(1);
    let login = args.next().unwrap_or_default();
    let password = args.next().unwrap_or_default();

    if login.is_empty() || password.is_empty() {
        eprintln!("Usage: admin_cli <login> <password>");
        std::process::exit(2);
    }

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(DATABASE_URL)
        .await?;

    let password_hash = hash_password(&password)?;

    let id: i64 = sqlx::query_scalar(
        r#"
        INSERT INTO users (login, password_hash, role)
        VALUES ($1, $2, 'admin')
        RETURNING id
        "#,
    )
    .bind(login)
    .bind(password_hash)
    .fetch_one(&pool)
    .await?;

    println!("Created admin user with id={id}");
    Ok(())
}
