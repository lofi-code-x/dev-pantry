// src/domain/post/service.rs

use crate::domain::me;
use crate::domain::post::dto::{
    InsertParams, InsertQuizOptionParams, InsertQuizQuestionParams, PostCreateRequest, PostRequest,
    QuizAttemptView, QuizOptionAdminView, QuizOptionView, QuizQuestionAdminView, QuizQuestionView,
    QuizSubmitRequest, QuizSubmitResult, UpdateParams, UpdateQuizOptionParams,
    UpdateQuizQuestionParams,
};
use crate::domain::post::model::Post;
use crate::domain::post::repo;
use crate::domain::uploads;
use crate::domain::uploads::dto::AttachPostImagesParams;
use crate::domain::xp;
use crate::error;
use sqlx::PgPool;
use std::collections::HashSet;
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
        out.push(QuizQuestionView {
            id: q.id,
            question_text: q.question_text,
            sort_order: q.sort_order,
            options: options_map.remove(&q.id).unwrap_or_default(),
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
        out.push(QuizQuestionAdminView {
            id: q.id,
            question_text: q.question_text,
            sort_order: q.sort_order,
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
    let correct = repo::select_correct_option_ids_by_post_id(pool, post_id).await?;
    let total_questions = correct.len() as i32;
    if total_questions == 0 {
        return Ok(QuizSubmitResult {
            total_questions,
            correct_answers: 0,
            is_passed: false,
        });
    }

    let mut answer_map: std::collections::HashMap<i64, i64> = std::collections::HashMap::new();
    for ans in &req.answers {
        answer_map.insert(ans.question_id, ans.option_id);
    }

    let mut correct_answers = 0;
    for (q_id, correct_option_id) in correct {
        if let Some(chosen) = answer_map.get(&q_id)
            && *chosen == correct_option_id
        {
            correct_answers += 1;
        }
    }

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
    Ok(Some(QuizAttemptView { is_passed, answers }))
}

pub async fn add_quiz_question(
    pool: &PgPool,
    params: InsertQuizQuestionParams,
) -> error::Result<i64> {
    repo::insert_quiz_question(pool, params).await
}

pub async fn update_quiz_question(
    pool: &PgPool,
    id: i64,
    params: UpdateQuizQuestionParams,
) -> error::Result<()> {
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

pub async fn add_quiz_option(pool: &PgPool, params: InsertQuizOptionParams) -> error::Result<i64> {
    repo::insert_quiz_option(pool, params).await
}

pub async fn update_quiz_option(
    pool: &PgPool,
    id: i64,
    params: UpdateQuizOptionParams,
) -> error::Result<()> {
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
