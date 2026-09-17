/* ============================================================
   EVENT-LEVEL MENU ASSIGNMENT

   Product truth:
   - meal_items are the permanent reusable food library
   - meal_menus compose those items by weekday + meal type
   - an event chooses one meal menu
   - event_meals only schedule service times/types
   ============================================================ */

ALTER TABLE events
  ADD COLUMN meal_menu_id BIGINT
    REFERENCES meal_menus(id);

/* Preserve existing data only when an event already used one
   unambiguous menu across all of its scheduled meals. */
UPDATE events e
SET meal_menu_id = source.menu_id
FROM (
  SELECT
    event_id,
    MIN(menu_id) AS menu_id
  FROM event_meals
  WHERE menu_id IS NOT NULL
  GROUP BY event_id
  HAVING COUNT(DISTINCT menu_id) = 1
) source
WHERE source.event_id = e.id;

CREATE INDEX events_meal_menu_idx
  ON events (meal_menu_id)
  WHERE meal_menu_id IS NOT NULL;

ALTER TABLE event_meals
  DROP COLUMN menu_id;
