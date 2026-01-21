CREATE TABLE categories
(
    tag   TEXT PRIMARY KEY,
    title TEXT NOT NULL
);

INSERT INTO categories (tag, title)
VALUES ('all', 'All')
    ON CONFLICT DO NOTHING;