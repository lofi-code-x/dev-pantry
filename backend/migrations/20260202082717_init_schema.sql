CREATE TABLE module_sections
(
    id          BIGSERIAL PRIMARY KEY,
    module_id   BIGINT      NOT NULL REFERENCES modules (id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    description TEXT,
    sort_order  INT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX module_sections_order_idx
    ON module_sections (module_id, sort_order, id);

ALTER TABLE module_items
    ADD COLUMN section_id BIGINT NULL REFERENCES module_sections (id) ON DELETE SET NULL;

CREATE INDEX module_items_section_order_idx
    ON module_items (section_id, sort_order, id);
