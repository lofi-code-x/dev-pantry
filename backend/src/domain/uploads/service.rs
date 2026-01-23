use crate::domain::uploads::dto::UploadResponse;
use crate::error;
use axum::extract::Multipart;
use std::path::{Path, PathBuf};
use tokio::fs as tokio_fs;
use uuid::Uuid;

const UPLOAD_DIR: &str = "uploads/images";
const MAX_SIZE: usize = 10 * 1024 * 1024;

pub async fn upload(mut multipart: Multipart) -> error::Result<UploadResponse> {
    tokio_fs::create_dir_all(UPLOAD_DIR).await?;

    while let Some(field) = multipart.next_field().await? {
        if field.name() != Some("file") {
            continue;
        }

        let original_filename = field
            .file_name()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "image".to_string());

        let ext = Path::new(&original_filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("bin");

        let data = field.bytes().await?;

        if data.len() > MAX_SIZE {
            return Err(error::Error::BadRequest("Файл превышает 10MB".to_string()));
        }

        let filename = format!("{}.{}", Uuid::new_v4(), ext);
        let filepath = PathBuf::from(UPLOAD_DIR).join(&filename);

        tokio_fs::write(&filepath, &data).await?;

        // URL для раздачи через ServeDir
        let url = format!("/uploads/images/{}", filename);

        return Ok(UploadResponse { url });
    }

    Err(error::Error::BadRequest(
        "Поле 'file' не найдено".to_string(),
    ))
}
