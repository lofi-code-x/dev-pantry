use crate::error::Error;
use axum::http::StatusCode;
use axum::{
    Json,
    response::{IntoResponse, Response},
};
use serde::Serialize;

pub type JsonResult<T> = Result<(StatusCode, Json<T>), ApiError>;
pub type StatusResult = Result<StatusCode, ApiError>;

#[derive(Debug)]
pub struct ApiError {
    pub message: String,
    pub status: StatusCode,
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

impl ApiError {
    pub fn map(err: Error) -> Self {
        match err {
            Error::Sqlx(sqlx::Error::RowNotFound) => ApiError::not_found(),
            Error::BadRequest(msg) => ApiError::bad_request(msg),
            Error::Verify(_) => ApiError::unauthorized(),
            Error::NotFound(_) => ApiError::not_found(),
            other => ApiError::internal(other),
        }
    }

    pub fn internal(err: impl std::fmt::Display) -> Self {
        tracing::error!("Internal error: {err}");
        Self::new(StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error")
    }

    pub fn not_found() -> Self {
        Self::new(StatusCode::NOT_FOUND, "Not Found")
    }

    pub fn bad_request(msg: String) -> Self {
        Self::new(StatusCode::BAD_REQUEST, msg)
    }

    pub fn unauthorized() -> Self {
        Self {
            status: StatusCode::UNAUTHORIZED,
            message: "Unauthorized".to_string(),
        }
    }

    pub fn forbidden() -> Self {
        Self {
            status: StatusCode::FORBIDDEN,
            message: "Forbidden".to_string(),
        }
    }

    fn new(status: StatusCode, msg: impl Into<String>) -> Self {
        Self {
            status,
            message: msg.into(),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(ErrorBody {
                error: self.message,
            }),
        )
            .into_response()
    }
}
