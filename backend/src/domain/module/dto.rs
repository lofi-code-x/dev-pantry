use serde::Deserialize;

#[derive(Deserialize)]
pub struct InsertModuleParams {
    pub title: String,
    pub description: Option<String>,
    pub author_id: i64,
    pub is_published: bool,
}

#[derive(Deserialize)]
pub struct UpdateModuleParams {
    pub title: String,
    pub description: Option<String>,
}

#[derive(Deserialize)]
pub struct InsertModuleItemParams {
    pub module_id: i64,
    pub post_id: i64,
    pub sort_order: i32,
}

#[derive(Deserialize)]
pub struct UpdateModuleItemParams {
    pub sort_order: i32,
}

#[derive(serde::Deserialize)]
pub struct OnlyPublishedQuery {
    pub only_published: Option<bool>,
}

#[derive(Deserialize)]
pub struct ModuleSetPublicRequest {
    pub is_public: bool,
}
