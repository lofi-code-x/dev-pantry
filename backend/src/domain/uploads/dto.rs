use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct InsertUploadParams {
    pub id: Uuid,
    pub key: String,
    pub content_type: String,
    pub size_bytes: i64,
    pub created_by: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct AttachPostImagesParams {
    pub post_id: i64,
    pub upload_ids: Vec<Uuid>,
}

#[derive(Debug, Clone)]
pub struct AttachModuleImagesParams {
    pub module_id: i64,
    pub upload_ids: Vec<Uuid>,
}

#[derive(Debug, Clone)]
pub struct SetUserAvatarParams {
    pub user_id: i64,
    pub upload_id: Uuid,
}

#[derive(serde::Serialize, Debug)]
pub struct UploadResponse {
    pub id: Uuid,
    pub url: String,
}

#[derive(serde::Serialize, Debug, Clone)]
pub struct UploadView {
    pub id: Uuid,
    pub url: String,
}

#[derive(serde::Deserialize)]
pub struct ModuleImagesBatchQuery {
    /// "1,2,3"
    pub ids: Option<String>,
}