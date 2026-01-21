use regex::Regex;
use serde::Deserialize;
use std::sync::LazyLock;

const DEFAULT_LIMIT: i32 = 10;
const MAX_LIMIT: i32 = 20;

pub struct SearchParams {
    pub query: String,
    pub tag: Option<String>,
    pub offset: i32,
    pub limit: i32,
    pub has_query: bool,
}

#[derive(Deserialize, Debug)]
pub struct PostRequest {
    pub query: Option<String>,
    pub tag: Option<String>,
    pub offset: Option<i32>,
    pub limit: Option<i32>,
}

impl From<PostRequest> for SearchParams {
    fn from(req: PostRequest) -> SearchParams {
        let query = req.query.unwrap_or_default().trim().to_string();
        let has_query = !query.is_empty();

        let tag = req
            .tag
            .as_deref()
            .map(str::trim)
            .filter(|t| !t.is_empty() && *t != "all")
            .map(|t| t.to_string());

        let offset = req.offset.unwrap_or(0).max(0);
        let limit = req.limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT);

        Self {
            query,
            tag,
            offset,
            limit,
            has_query,
        }
    }
}

pub struct InsertParams {
    pub title: String,
    pub content_markdown: String,
    pub preview_text: String,
    pub category_tag: String,
    pub author: String,
    pub is_published: bool,
}

#[derive(Deserialize)]
pub struct PostCreateRequest {
    pub title: String,
    pub content_markdown: String,
    pub category_tag: String,
    pub author: String,
}

impl From<PostCreateRequest> for InsertParams {
    fn from(req: PostCreateRequest) -> InsertParams {
        let preview_text = make_preview_text(&req.content_markdown, 300);

        Self {
            title: req.title,
            content_markdown: req.content_markdown,
            preview_text,
            category_tag: req.category_tag,
            author: req.author,
            is_published: true,
        }
    }
}

fn make_preview_text(md: &str, max_chars: usize) -> String {
    static RE_IMG_INLINE: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"!\[[^\]]*\]\([^\)]*\)").unwrap());
    static RE_LINK_INLINE: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"\[([^\]]+)\]\([^\)]+\)").unwrap());

    let s = md.trim();
    if s.is_empty() {
        return String::new();
    }

    // 1) убрать картинки
    let s = RE_IMG_INLINE.replace_all(s, "").to_string();
    // 2) ссылки -> текст
    let s = RE_LINK_INLINE.replace_all(&s, "$1").to_string();
    // 3) прибрать базовую разметку
    let s = s.replace(['`', '*', '_', '#', '>'], "");

    // 4) схлопнуть пробелы
    let s = s.split_whitespace().collect::<Vec<_>>().join(" ");

    // 5) обрезать по границе слова
    if s.chars().count() <= max_chars {
        return s;
    }

    cut_on_word_boundary(&s, max_chars) + "…"
}

fn cut_on_word_boundary(s: &str, max_chars: usize) -> String {
    let mut count = 0usize;
    let mut last_space_byte = None;

    for (i, ch) in s.char_indices() {
        count += 1;
        if ch.is_whitespace() {
            last_space_byte = Some(i);
        }
        if count >= max_chars {
            let cut_at = last_space_byte.unwrap_or(i);
            return s[..cut_at].trim_end().to_string();
        }
    }
    s.to_string()
}
