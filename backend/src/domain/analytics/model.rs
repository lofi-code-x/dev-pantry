use chrono::NaiveDate;

#[derive(sqlx::FromRow, serde::Serialize)]
pub struct DailyStats {
    pub day: NaiveDate,
    pub pageviews: i64,
    pub pageviews_auth: i64,
    pub pageviews_anon: i64,
    pub unique_visitors: i64,
    pub unique_auth: i64,
    pub unique_anon: i64,
}
