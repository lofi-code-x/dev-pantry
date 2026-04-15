# Как делать backup DB

Бэкап PostgreSQL
```bash
docker exec -t questlab-db pg_dump -U questlab -d questlab > questlab_backup.sql
```

Бэкап картинок

```bash
tar -czf uploads_backup.tar.gz -C . uploads
```

Скачать файл с сервера на локальную машину:
```bash
scp user@host:/path/to/remote/file /path/to/local/
```

Удалить старую БД
```bash
docker compose down -v
```

Поднять чистую БД
```bash
docker compose up
```

Восстановить новую БД

```bash
cat /home/user/questlab_backup.sql | docker exec -i questlab-db psql -U questlab -d questlab
```