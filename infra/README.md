# 1️⃣   Устанавливаем sqlx-cli (если ещё нет)

### В корне backend-проекта:
``cargo install sqlx-cli --no-default-features --features postgres,rustls``

# 2️⃣   Создаём папку миграций

### В корне backend-проекта:

``sqlx migrate add init_schema``

Это создаст файл типа:

* migrations/20251201120000_init_schema.sql

Открой этот файл и замени содержимое на свой sql

# 3️⃣   Прогоняем миграции

``sqlx migrate run --database-url postgres://admin:admin@localhost:5432/dev-pantry``

Если всё ок — увидишь что-то вроде:

* Applied 20251201120000/init_schema
