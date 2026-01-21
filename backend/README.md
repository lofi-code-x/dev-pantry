## API

### Auth

- **POST** `/api/auth/create`
    - Body:
      ```json
      { "login": "user1", "password": "secret123" }
      ``` 
- **POST** `/api/auth/login`
    - Body:
      ```json
      { "login": "user@example.com", "password": "secret123" }
      ```

### Category

- **GET** `/api/category/get-all`
- **DELETE** `/api/category/delete/{tag}`
- **POST** `/api/category/create`
    - Body:
      ```json
      { "title": "Network" }
      ``` 

### Posts

- **GET** `/api/posts/search`
    - Query:
      ```
      - query (optional) — строка поиска
      - tag (optional) — тег категории (all / пусто = без фильтра)
      - offset (optional, default: 0)
      - limit (optional, default: 10, max: 20)
      
      Example - /api/posts/search?query=rust%20axum&tag=rust&offset=0&limit=10
      ```
- **GET** `/api/posts/get/{id}`
- **POST** `/api/posts/create`
    - Body:
    ```json 
  {
  "title": "My post",
  "content_markdown": "# Hello",
  "preview_text": "Short preview",
  "category_tag": "rust",
  "author": "admin",
  "is_published": true
  }
  ```
- **PUT** `/api/posts/update/{id}`
    - Body:
    ```json 
  {
  "title": "My post",
  "content_markdown": "# Hello",
  "preview_text": "Short preview",
  "category_tag": "rust",
  "author": "admin",
  "is_published": true
  }
  ```
- **DELETE** `/api/posts/delete/{id}`