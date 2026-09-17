/* ============================================================
   REUSABLE MENU SERVICE SCOPE
   One reusable menu can contain different food for each
   weekday + meal type while event meals still link one menu.
   Existing menu items remain valid as all-day/all-meal items.
   ============================================================ */

ALTER TABLE meal_menu_items
  ADD COLUMN meal_type_id BIGINT
    REFERENCES meal_types(id),
  ADD COLUMN day_of_week SMALLINT
    CHECK (day_of_week BETWEEN 0 AND 6);

CREATE INDEX meal_menu_items_service_scope_idx
  ON meal_menu_items (
    menu_id,
    day_of_week,
    meal_type_id,
    sort_order,
    id
  );
