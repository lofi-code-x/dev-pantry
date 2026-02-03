#[derive(serde::Deserialize)]
pub struct OnlyPublishedQuery {
    pub only_published: Option<bool>,
}

#[derive(serde::Deserialize)]
pub struct ProgressListQuery {
    pub only_published: Option<bool>,
    pub only_completed: Option<bool>,
}

#[derive(serde::Deserialize)]
pub struct PostIdBody {
    pub post_id: i64,
}

#[derive(serde::Deserialize)]
pub struct UpdateContactsRequest {
    pub email: Option<String>,
    pub website: Option<String>,
    pub github: Option<String>,
    pub telegram: Option<String>,
}
