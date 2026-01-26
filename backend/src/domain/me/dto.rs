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
