use std::collections::HashMap;
use crate::domain::uploads::dto::{
    InsertUploadParams, SetUserAvatarParams, UploadResponse, UploadView,
};
use crate::domain::uploads::repo;
use crate::error;
use axum::extract::Multipart;
use sqlx::PgPool;
use std::path::{Path, PathBuf};
use tokio::fs as tokio_fs;
use uuid::Uuid;

const UPLOAD_DIR: &str = "uploads/images"; // физический путь для файлов картинок
const UPLOADS_ROOT: &str = "uploads"; // корень для удаления по key ("images/..")
const MAX_SIZE: usize = 10 * 1024 * 1024;

fn ext_from_content_type(ct: &str) -> Option<&'static str> {
    match ct {
        "image/png" => Some("png"),
        "image/jpeg" => Some("jpg"),
        "image/webp" => Some("webp"),
        "image/gif" => Some("gif"),
        _ => None,
    }
}

fn ext_from_filename(filename: &str) -> Option<String> {
    let ext = Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())?;

    let ext = match ext.as_str() {
        "png" => "png",
        "jpg" => "jpg",
        "jpeg" => "jpg",
        "webp" => "webp",
        "gif" => "gif",
        _ => return None,
    };

    Some(ext.to_string())
}

pub async fn upload_image(
    pool: &PgPool,
    mut multipart: Multipart,
    created_by: Option<i64>,
) -> error::Result<UploadResponse> {
    tokio_fs::create_dir_all(UPLOAD_DIR).await?;

    while let Some(field) = multipart.next_field().await? {
        if field.name() != Some("file") {
            continue;
        }

        // bytes() consuming: метаданные читаем заранее
        let content_type = field
            .content_type()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "application/octet-stream".to_string());

        let original_filename = field
            .file_name()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "image".to_string());

        let data = field.bytes().await?;
        if data.is_empty() {
            return Err(error::Error::BadRequest("Пустой файл".to_string()));
        }
        if data.len() > MAX_SIZE {
            return Err(error::Error::BadRequest("Файл превышает 10MB".to_string()));
        }

        let ext = ext_from_content_type(&content_type)
            .map(|s| s.to_string())
            .or_else(|| ext_from_filename(&original_filename))
            .ok_or_else(|| {
                error::Error::BadRequest(
                    "Неподдерживаемый формат. Разрешены: png, jpg, webp, gif".to_string(),
                )
            })?;

        // ЕДИНЫЙ UUID для: имени файла, записи uploads.id, ответа фронту
        let id = Uuid::new_v4();

        // файл на диске
        let filename = format!("{}.{}", id, ext);
        let filepath = PathBuf::from(UPLOAD_DIR).join(&filename);

        tokio_fs::write(&filepath, &data).await?;

        // key в БД и url для фронта
        // key: "images/<uuid>.ext"
        let key = format!("images/{}", filename);
        let url = format!("/uploads/{}", key);

        // запись в БД С ТЕМ ЖЕ id
        let inserted = repo::insert_upload(
            pool,
            InsertUploadParams {
                id,
                key: key.clone(),
                content_type: content_type.clone(),
                size_bytes: data.len() as i64,
                created_by,
            },
        )
        .await;

        return match inserted {
            Ok(_u) => Ok(UploadResponse { id, url }),
            Err(e) => {
                // если запись в БД не сохранилась — удаляем файл
                let _ = tokio_fs::remove_file(&filepath).await;
                Err(e)
            }
        };
    }

    Err(error::Error::BadRequest(
        "Поле 'file' не найдено".to_string(),
    ))
}

/// Загрузить аватар: сохранить upload + привязать к пользователю.
/// Если уже был аватар — удаляем его (и файл), если он больше нигде не используется.
pub async fn upload_user_avatar(
    pool: &PgPool,
    multipart: Multipart,
    user_id: i64,
) -> error::Result<UploadResponse> {
    let previous = repo::get_user_avatar(pool, user_id).await?;

    let uploaded = upload_image(pool, multipart, Some(user_id)).await?;

    let rows = repo::set_user_avatar(
        pool,
        SetUserAvatarParams {
            user_id,
            upload_id: uploaded.id,
        },
    )
    .await?;

    if rows == 0 {
        // user not found -> откатываем загруженный upload
        let _ = delete_uploads_and_files(pool, &[uploaded.id]).await;
        return Err(error::Error::NotFound(format!("User {} not found", user_id)));
    }

    if let Some(prev) = previous {
        let in_use = repo::list_in_use_upload_ids(pool, &[prev.id]).await?;
        if in_use.is_empty() {
            delete_uploads_and_files(pool, &[prev.id]).await?;
        }
    }

    Ok(uploaded)
}

/// Удалить аватар пользователя: очистить users.avatar_upload_id и удалить upload + файл,
/// если он больше нигде не используется.
pub async fn delete_user_avatar(pool: &PgPool, user_id: i64) -> error::Result<()> {
    let previous = repo::get_user_avatar(pool, user_id).await?;

    let rows = repo::clear_user_avatar(pool, user_id).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!("User {} not found", user_id)));
    }

    if let Some(prev) = previous {
        let in_use = repo::list_in_use_upload_ids(pool, &[prev.id]).await?;
        if in_use.is_empty() {
            delete_uploads_and_files(pool, &[prev.id]).await?;
        }
    }

    Ok(())
}

pub async fn list_post_image_views(pool: &PgPool, post_id: i64) -> error::Result<Vec<UploadView>> {
    let rows = repo::list_post_images(pool, post_id).await?;
    Ok(rows
        .into_iter()
        .map(|u| UploadView {
            id: u.id,
            url: format!("/uploads/{}", u.key),
        })
        .collect())
}

// ✅ NEW: список картинок модуля (у тебя по факту 1 картинка = 1 модуль, но возвращаем Vec)
pub async fn list_module_image_views(
    pool: &PgPool,
    module_id: i64,
) -> error::Result<Vec<UploadView>> {
    let rows = repo::list_module_images(pool, module_id).await?;
    Ok(rows
        .into_iter()
        .map(|u| UploadView {
            id: u.id,
            url: format!("/uploads/{}", u.key),
        })
        .collect())
}

/// Удалить файлы по их key из uploads таблицы.
/// key в БД: "images/<uuid>.ext"
/// физический файл: "uploads/images/<uuid>.ext"
pub async fn delete_files_by_keys(keys: &[String]) -> error::Result<()> {
    for key in keys {
        let path = PathBuf::from(UPLOADS_ROOT).join(key);

        // best-effort: если файла нет — не падаем
        match tokio_fs::remove_file(&path).await {
            Ok(_) => {}
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => {
                return Err(error::Error::Internal(format!(
                    "Failed to remove file {:?}: {}",
                    path, e
                )));
            }
        }
    }
    Ok(())
}

/// Полная очистка upload'ов:
/// 1) берём их key
/// 2) удаляем строки uploads (если FK RESTRICT не даёт — вернём ошибку)
/// 3) удаляем файлы (best-effort)
///
/// ВАЖНО: вызывать только для upload_id, которые уже "не используются" (иначе delete упадёт).
pub async fn delete_uploads_and_files(pool: &PgPool, ids: &[Uuid]) -> error::Result<()> {
    if ids.is_empty() {
        return Ok(());
    }

    let pairs = repo::select_upload_keys_by_ids(pool, ids).await?;
    let keys: Vec<String> = pairs.into_iter().map(|(_id, key)| key).collect();

    // сначала DB (если упадёт — файлы не трогаем)
    repo::delete_uploads_by_ids(pool, ids).await?;

    // затем диск (best-effort)
    delete_files_by_keys(&keys).await?;

    Ok(())
}

/// Batch: module_id -> Option<UploadView>
/// Возвращаем map со ВСЕМИ запрошенными module_id (если нет картинки => null).
pub async fn list_module_image_views_batch(
    pool: &PgPool,
    module_ids: &[i64],
) -> error::Result<HashMap<i64, Option<UploadView>>> {
    let mut out: HashMap<i64, Option<UploadView>> = HashMap::new();

    // заранее проставим None для всех запрошенных
    for &mid in module_ids {
        out.insert(mid, None);
    }

    if module_ids.is_empty() {
        return Ok(out);
    }

    let rows = repo::select_module_cover_uploads_by_module_ids(pool, module_ids).await?;

    for (module_id, upload_id, key) in rows {
        out.insert(
            module_id,
            Some(UploadView {
                id: upload_id,
                url: format!("/uploads/{}", key),
            }),
        );
    }

    Ok(out)
}
