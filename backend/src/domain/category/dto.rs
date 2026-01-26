use serde::Deserialize;

#[derive(Deserialize)]
pub struct CategoryRequest {
    pub title: String,
}
