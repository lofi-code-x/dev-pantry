// src/domain/post/service.rs

use crate::domain::me;
use crate::domain::post::dto::{
    InsertParams, InsertQuizOptionParams, InsertQuizQuestionParams, PostCreateRequest, PostRequest,
    QuizAttemptView, QuizOptionAdminView, QuizOptionView, QuizQuestionAdminView, QuizQuestionType,
    QuizQuestionView, QuizSubmitRequest, QuizSubmitResult, TextInputValidationRule, UpdateParams,
    UpdateQuizOptionParams, UpdateQuizQuestionParams,
};
use crate::domain::post::model::{Post, QuizAnswer};
use crate::domain::post::repo;
use crate::domain::uploads;
use crate::domain::uploads::dto::AttachPostImagesParams;
use crate::domain::xp;
use crate::error;
use sqlx::PgPool;
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

pub async fn search(
    pool: &PgPool,
    req: PostRequest,
    only_published: bool,
) -> error::Result<Vec<Post>> {
    repo::search(pool, req.into(), only_published).await
}

pub async fn get(pool: &PgPool, id: i64, only_published: bool) -> error::Result<Post> {
    repo::select_by_id(pool, id, only_published)
        .await?
        .ok_or(error::Error::NotFound(format!("post {} not found", id)))
}

pub async fn create(
    pool: &PgPool,
    mut req: PostCreateRequest,
    is_public: bool,
) -> error::Result<i64> {
    // забираем upload_ids отдельно (чтобы не таскать их в InsertParams)
    let image_upload_ids = std::mem::take(&mut req.image_upload_ids);

    // 1) создаём пост
    let post_id = repo::insert(pool, InsertParams::new(req, is_public)).await?;

    // 2) привязываем картинки
    if !image_upload_ids.is_empty() {
        uploads::repo::attach_post_images(
            pool,
            AttachPostImagesParams {
                post_id,
                upload_ids: image_upload_ids,
            },
        )
        .await?;
    }

    Ok(post_id)
}

pub async fn update(pool: &PgPool, mut req: PostCreateRequest, id: i64) -> error::Result<i64> {
    // 1) забираем новый список картинок
    let new_ids: Vec<Uuid> = std::mem::take(&mut req.image_upload_ids);

    // 2) обновляем сам пост
    let updated_id = repo::update_by_id(pool, UpdateParams::from(req), id)
        .await?
        .ok_or(error::Error::NotFound(format!("Post {} not found.", id)))?;

    // 3) синхронизируем post_images
    let old_ids = uploads::repo::list_post_image_ids(pool, updated_id).await?;

    let old: HashSet<Uuid> = old_ids.into_iter().collect();
    let new: HashSet<Uuid> = new_ids.iter().cloned().collect();

    // что добавить / удалить
    let to_add: Vec<Uuid> = new.difference(&old).cloned().collect();
    let to_remove: Vec<Uuid> = old.difference(&new).cloned().collect();

    // 3.1) detach
    if !to_remove.is_empty() {
        uploads::repo::detach_post_images(pool, updated_id, &to_remove).await?;

        // 3.2) чистим uploads + файлы только если больше нигде не используется
        // (модули/посты/аватар)
        let in_use = uploads::repo::list_in_use_upload_ids(pool, &to_remove).await?;
        let in_use_set: HashSet<Uuid> = in_use.into_iter().collect();

        let deletable: Vec<Uuid> = to_remove
            .into_iter()
            .filter(|u| !in_use_set.contains(u))
            .collect();

        if !deletable.is_empty() {
            // удалит строки из uploads и файл на диске по key
            uploads::service::delete_uploads_and_files(pool, &deletable).await?;
        }
    }

    // 3.3) attach
    if !to_add.is_empty() {
        uploads::repo::attach_post_images(
            pool,
            AttachPostImagesParams {
                post_id: updated_id,
                upload_ids: to_add,
            },
        )
        .await?;
    }

    Ok(updated_id)
}

pub async fn delete(pool: &PgPool, id: i64) -> error::Result<()> {
    // 1) заранее забираем все upload_id, привязанные к посту
    // (после удаления поста они исчезнут из post_images из-за ON DELETE CASCADE)
    let post_upload_ids = uploads::repo::list_post_image_ids(pool, id).await?;

    // 2) удаляем пост
    let rows = repo::delete_by_id(pool, id).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!("Post {} not found.", id)));
    }

    // 3) чистим uploads + файлы только если upload_id больше нигде не используется
    if !post_upload_ids.is_empty() {
        let in_use = uploads::repo::list_in_use_upload_ids(pool, &post_upload_ids).await?;
        let in_use_set: HashSet<Uuid> = in_use.into_iter().collect();

        let deletable: Vec<Uuid> = post_upload_ids
            .into_iter()
            .filter(|u| !in_use_set.contains(u))
            .collect();

        if !deletable.is_empty() {
            uploads::service::delete_uploads_and_files(pool, &deletable).await?;
        }
    }

    Ok(())
}

pub async fn set_public(pool: &PgPool, id: i64, is_public: bool) -> error::Result<()> {
    let rows = repo::set_public_by_id(pool, id, is_public).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!("Post {} not found.", id)));
    }
    Ok(())
}

// -------------------------------- Quiz ----------------------------------

fn parse_question_type(raw: &str) -> error::Result<QuizQuestionType> {
    match raw {
        "single_choice" => Ok(QuizQuestionType::SingleChoice),
        "text_input" => Ok(QuizQuestionType::TextInput),
        other => Err(error::Error::Internal(format!(
            "unknown quiz question_type in db: {other}"
        ))),
    }
}

fn parse_text_validation(raw: Option<&str>) -> error::Result<Option<TextInputValidationRule>> {
    raw.map(|value| {
        let parsed = serde_json::from_str::<TextInputValidationRule>(value).map_err(|e| {
            error::Error::Internal(format!("invalid text_validation config in db: {e}"))
        })?;
        Ok::<_, error::Error>(sanitize_text_validation(&parsed))
    })
    .transpose()
}

fn sanitize_text_validation(rule: &TextInputValidationRule) -> TextInputValidationRule {
    let mut correct_answer = normalize_spacing(&rule.correct_answer);

    if correct_answer.is_empty() {
        correct_answer = rule
            .accepted
            .iter()
            .map(|x| normalize_spacing(x))
            .find(|x| !x.is_empty())
            .unwrap_or_default();
    }

    TextInputValidationRule {
        correct_answer,
        accepted: vec![],
    }
}

fn validate_text_validation_rule(rule: &TextInputValidationRule) -> error::Result<()> {
    if normalize_spacing(&rule.correct_answer).is_empty() {
        return Err(error::Error::BadRequest(
            "text_input question requires non-empty correct_answer".to_string(),
        ));
    }

    Ok(())
}

fn validate_question_payload(
    question_type: QuizQuestionType,
    text_validation: Option<&TextInputValidationRule>,
) -> error::Result<()> {
    match question_type {
        QuizQuestionType::SingleChoice => {
            if text_validation.is_some() {
                return Err(error::Error::BadRequest(
                    "single_choice question must not contain text_validation".to_string(),
                ));
            }
            Ok(())
        }
        QuizQuestionType::TextInput => {
            let Some(rule) = text_validation else {
                return Err(error::Error::BadRequest(
                    "text_input question requires text_validation".to_string(),
                ));
            };
            validate_text_validation_rule(rule)
        }
    }
}

fn normalize_spacing(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn normalize_for_compare(value: &str) -> String {
    normalize_spacing(value).to_lowercase()
}

fn make_answer_hint(answer: &str) -> String {
    let spaced = normalize_spacing(answer);
    spaced
        .chars()
        .map(|ch| if ch.is_whitespace() { ' ' } else { '_' })
        .collect()
}

fn is_text_input_answer_correct(
    input: &str,
    rule: &TextInputValidationRule,
) -> error::Result<bool> {
    let expected = normalize_for_compare(&rule.correct_answer);
    let submitted = normalize_for_compare(input);
    if submitted.is_empty() {
        return Ok(false);
    }

    Ok(submitted == expected)
}

fn validate_submitted_answer_shape(answer: &QuizAnswer) -> error::Result<()> {
    match (&answer.option_id, &answer.answer_text) {
        (Some(_), None) => Ok(()),
        (None, Some(text)) if !text.trim().is_empty() => Ok(()),
        _ => Err(error::Error::BadRequest(format!(
            "Question {} answer must contain exactly one of option_id or answer_text",
            answer.question_id
        ))),
    }
}

fn collect_correct_question_ids(
    questions: &[crate::domain::post::model::QuizScoringQuestion],
    answer_map: &HashMap<i64, &QuizAnswer>,
) -> error::Result<Vec<i64>> {
    let mut correct_question_ids: Vec<i64> = Vec::new();

    for q in questions {
        let Some(submitted) = answer_map.get(&q.question_id) else {
            continue;
        };

        let question_type = parse_question_type(&q.question_type)?;
        match question_type {
            QuizQuestionType::SingleChoice => {
                let Some(correct_option_id) = q.correct_option_id else {
                    return Err(error::Error::Internal(format!(
                        "single_choice question {} does not have correct option",
                        q.question_id
                    )));
                };

                if submitted.option_id == Some(correct_option_id) {
                    correct_question_ids.push(q.question_id);
                }
            }
            QuizQuestionType::TextInput => {
                let Some(answer_text) = submitted.answer_text.as_deref() else {
                    continue;
                };

                let validation =
                    parse_text_validation(q.text_validation.as_deref())?.ok_or_else(|| {
                        error::Error::Internal(format!(
                            "text_input question {} has no validation config",
                            q.question_id
                        ))
                    })?;
                validate_text_validation_rule(&validation)?;

                if is_text_input_answer_correct(answer_text, &validation)? {
                    correct_question_ids.push(q.question_id);
                }
            }
        }
    }

    Ok(correct_question_ids)
}

pub async fn list_quiz_questions(
    pool: &PgPool,
    post_id: i64,
) -> error::Result<Vec<QuizQuestionView>> {
    let questions = repo::select_quiz_questions_by_post_id(pool, post_id).await?;
    let question_ids: Vec<i64> = questions.iter().map(|q| q.id).collect();
    let options = repo::select_quiz_options_by_question_ids(pool, &question_ids).await?;

    let mut options_map: std::collections::HashMap<i64, Vec<QuizOptionView>> =
        std::collections::HashMap::new();
    for opt in options {
        options_map
            .entry(opt.question_id)
            .or_default()
            .push(QuizOptionView {
                id: opt.id,
                option_text: opt.option_text,
            });
    }

    let mut out = Vec::with_capacity(questions.len());
    for q in questions {
        let question_type = parse_question_type(&q.question_type)?;
        let answer_hint = if question_type == QuizQuestionType::TextInput {
            let validation = parse_text_validation(q.text_validation.as_deref())?;
            validation.map(|x| make_answer_hint(&x.correct_answer))
        } else {
            None
        };

        out.push(QuizQuestionView {
            id: q.id,
            question_text: q.question_text,
            sort_order: q.sort_order,
            question_type,
            answer_hint,
            options: if question_type == QuizQuestionType::SingleChoice {
                options_map.remove(&q.id).unwrap_or_default()
            } else {
                vec![]
            },
        });
    }

    Ok(out)
}

pub async fn list_quiz_questions_admin(
    pool: &PgPool,
    post_id: i64,
) -> error::Result<Vec<QuizQuestionAdminView>> {
    let questions = repo::select_quiz_questions_by_post_id(pool, post_id).await?;
    let question_ids: Vec<i64> = questions.iter().map(|q| q.id).collect();
    let options = repo::select_quiz_options_by_question_ids(pool, &question_ids).await?;

    let mut options_map: std::collections::HashMap<i64, Vec<QuizOptionAdminView>> =
        std::collections::HashMap::new();
    for opt in options {
        options_map
            .entry(opt.question_id)
            .or_default()
            .push(QuizOptionAdminView {
                id: opt.id,
                option_text: opt.option_text,
                is_correct: opt.is_correct,
            });
    }

    let mut out = Vec::with_capacity(questions.len());
    for q in questions {
        let question_type = parse_question_type(&q.question_type)?;
        let text_validation = parse_text_validation(q.text_validation.as_deref())?;

        out.push(QuizQuestionAdminView {
            id: q.id,
            question_text: q.question_text,
            sort_order: q.sort_order,
            question_type,
            text_validation,
            options: options_map.remove(&q.id).unwrap_or_default(),
        });
    }

    Ok(out)
}

pub async fn submit_quiz(
    pool: &PgPool,
    post_id: i64,
    user_id: i64,
    req: QuizSubmitRequest,
) -> error::Result<QuizSubmitResult> {
    let questions = repo::select_questions_for_scoring_by_post_id(pool, post_id).await?;
    let total_questions = questions.len() as i32;
    if total_questions == 0 {
        return Ok(QuizSubmitResult {
            total_questions,
            correct_answers: 0,
            is_passed: false,
            correct_question_ids: vec![],
        });
    }

    let question_ids: HashSet<i64> = questions.iter().map(|q| q.question_id).collect();
    let mut answer_map: HashMap<i64, &QuizAnswer> = HashMap::new();

    for ans in &req.answers {
        validate_submitted_answer_shape(ans)?;

        if !question_ids.contains(&ans.question_id) {
            return Err(error::Error::BadRequest(format!(
                "Question {} is not part of this quiz",
                ans.question_id
            )));
        }

        if answer_map.insert(ans.question_id, ans).is_some() {
            return Err(error::Error::BadRequest(format!(
                "Duplicate answer for question {}",
                ans.question_id
            )));
        }
    }

    if answer_map.is_empty() {
        return Err(error::Error::BadRequest(
            "Answer at least one question to submit.".to_string(),
        ));
    }

    let correct_question_ids = collect_correct_question_ids(&questions, &answer_map)?;
    let correct_answers = correct_question_ids.len() as i32;

    let is_passed = correct_answers == total_questions;
    let attempt_id = repo::insert_quiz_attempt(pool, user_id, post_id, is_passed).await?;
    repo::insert_quiz_answers(pool, attempt_id, &req.answers).await?;
    if is_passed {
        me::service::progress::mark_completed(pool, user_id, post_id).await?;
        let delta = xp::service::quiz_delta(total_questions, correct_answers);
        if delta > 0 {
            xp::service::award_quiz_passed(pool, user_id, post_id, delta).await?;
        }
    }

    Ok(QuizSubmitResult {
        total_questions,
        correct_answers,
        is_passed,
        correct_question_ids,
    })
}

pub async fn get_quiz_attempt(
    pool: &PgPool,
    post_id: i64,
    user_id: i64,
) -> error::Result<Option<QuizAttemptView>> {
    let attempt = repo::select_latest_quiz_attempt(pool, user_id, post_id).await?;
    let Some((attempt_id, is_passed)) = attempt else {
        return Ok(None);
    };

    let answers = repo::select_quiz_answers_by_attempt_id(pool, attempt_id).await?;
    let scoring_questions = repo::select_questions_for_scoring_by_post_id(pool, post_id).await?;
    let mut answer_map: HashMap<i64, &QuizAnswer> = HashMap::new();
    for answer in &answers {
        answer_map.insert(answer.question_id, answer);
    }
    let correct_question_ids = collect_correct_question_ids(&scoring_questions, &answer_map)?;

    Ok(Some(QuizAttemptView {
        is_passed,
        answers,
        correct_question_ids,
    }))
}

pub async fn add_quiz_question(
    pool: &PgPool,
    mut params: InsertQuizQuestionParams,
) -> error::Result<i64> {
    params.question_text = params.question_text.trim().to_string();
    if params.question_text.is_empty() {
        return Err(error::Error::BadRequest(
            "Question text is required.".to_string(),
        ));
    }

    if let Some(rule) = params.text_validation.as_ref() {
        params.text_validation = Some(sanitize_text_validation(rule));
    }
    validate_question_payload(params.question_type, params.text_validation.as_ref())?;

    repo::insert_quiz_question(pool, params).await
}

pub async fn update_quiz_question(
    pool: &PgPool,
    id: i64,
    mut params: UpdateQuizQuestionParams,
) -> error::Result<()> {
    params.question_text = params.question_text.trim().to_string();
    if params.question_text.is_empty() {
        return Err(error::Error::BadRequest(
            "Question text is required.".to_string(),
        ));
    }

    if let Some(rule) = params.text_validation.as_ref() {
        params.text_validation = Some(sanitize_text_validation(rule));
    }
    validate_question_payload(params.question_type, params.text_validation.as_ref())?;

    let rows = repo::update_quiz_question_by_id(pool, id, params).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!(
            "Quiz question {} not found.",
            id
        )));
    }
    Ok(())
}

pub async fn delete_quiz_question(pool: &PgPool, id: i64) -> error::Result<()> {
    let rows = repo::delete_quiz_question_by_id(pool, id).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!(
            "Quiz question {} not found.",
            id
        )));
    }
    Ok(())
}

pub async fn add_quiz_option(
    pool: &PgPool,
    mut params: InsertQuizOptionParams,
) -> error::Result<i64> {
    params.option_text = params.option_text.trim().to_string();
    if params.option_text.is_empty() {
        return Err(error::Error::BadRequest(
            "Option text is required.".to_string(),
        ));
    }

    let question_type = repo::select_quiz_question_type_by_id(pool, params.question_id).await?;
    if question_type.is_none() {
        return Err(error::Error::NotFound(format!(
            "Quiz question {} not found.",
            params.question_id
        )));
    }
    if matches!(question_type.as_deref(), Some("text_input")) {
        return Err(error::Error::BadRequest(
            "text_input question cannot have options".to_string(),
        ));
    }

    repo::insert_quiz_option(pool, params).await
}

pub async fn update_quiz_option(
    pool: &PgPool,
    id: i64,
    mut params: UpdateQuizOptionParams,
) -> error::Result<()> {
    params.option_text = params.option_text.trim().to_string();
    if params.option_text.is_empty() {
        return Err(error::Error::BadRequest(
            "Option text is required.".to_string(),
        ));
    }

    let question_type = repo::select_quiz_question_type_by_option_id(pool, id).await?;
    if matches!(question_type.as_deref(), Some("text_input")) {
        return Err(error::Error::BadRequest(
            "text_input question cannot have options".to_string(),
        ));
    }

    let rows = repo::update_quiz_option_by_id(pool, id, params).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!(
            "Quiz option {} not found.",
            id
        )));
    }
    Ok(())
}

pub async fn delete_quiz_option(pool: &PgPool, id: i64) -> error::Result<()> {
    let rows = repo::delete_quiz_option_by_id(pool, id).await?;
    if rows == 0 {
        return Err(error::Error::NotFound(format!(
            "Quiz option {} not found.",
            id
        )));
    }
    Ok(())
}
