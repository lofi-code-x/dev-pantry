```
backend/
    Cargo.toml
    Cargo.lock
    migrations/
    src/
    main.rs
    lib.rs
    config            # AppConfig (env + defaults)        
    app/
      mod.rs          # сборка Router, State, middleware
      state.rs        # AppState { db, config, ... }
      router.rs       # routes() -> Router
      middleware/
        mod.rs
        trace.rs
        cors.rs
        auth.rs       # опционально: общий слой auth
    db/
      mod.rs
      pool.rs         # create_pool()
      tx.rs           # helpers для транзакций (опционально)
    auth/
      mod.rs
      jwt.rs          # encode/decode, Claims
      password.rs     # hash/verify (argon2)
      extractor.rs    # CurrentUser extractor
      guard.rs        # require_role helpers
    error/
      mod.rs          # ApiError + IntoResponse
    util/
      mod.rs          # мелкие утилиты, time, id, etc.
    domain/
      mod.rs
      posts/
        mod.rs
        model.rs      # Post (domain)
        service.rs    # бизнес-логика
        repo.rs       # интерфейс/реализация SQLx
        dto.rs        # запросы/ответы (если хочешь держать ближе к домену)
      categories/
      modules/
      users/
        model.rs
        service.rs
        repo.rs
    api/
      mod.rs
      health.rs
      posts.rs        # handlers (axum)
      categories.rs
      modules.rs
      me.rs           # /me endpoints (bookmarks/read/completed)
      admin.rs        # админские эндпоинты (если есть)
      dto/
        mod.rs        # общие DTO (Pagination, PageResponse, etc.)
```

--------------------------------Release 0.1---------------------------------------------------------

1. Полный рефакторинг (сейчас огромная когнитиваная нагрузка, далее будет сложнее)
* тестирование

2. Навигация внутри модулей

* Перейти к предыдущему посту
* Перейти к следующему посту
* Пометить пост как прочитанный

3. ✅ Удобынй редактор (markdown, split страница)

4. ✅ Расширить роли
* Admin (полный контроль)
* Moderator (полный контроль, но не может влиять на админа)
* Editor (может создавать/редактировать посты)
* User (только чтение и возможность предложить пост)

7. ✅ Предложить пост (для обычных User)

* Статусы: pending, approved, rejected (admin, moder, editor редактируют, публикуют)



  --------------------------------Release 0.2---------------------------------------------------------

5. Админ-панель (admin, частично moderator)

* Просмотр всех зарегистрированных пользователей
* Бан / разбан пользователей
* Управление ролями (повышение, понижение прав)

6. Статистика

* какие страницы просматривались
* какие посты читались
* время на странице
* счётчик просмотров
  --------------------------------Release 0.3---------------------------------------------------------

8. Комментарии