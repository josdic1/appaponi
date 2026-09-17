/* ============================================================
   EXPLICIT EVENT MEAL COMPOSITION MODE

   Product truth:
   - DEFAULT_MENU means the service resolves from the event menu
   - CUSTOM means the service owns its explicit event_meal_items
   - CUSTOM may intentionally contain zero items
   ============================================================ */

ALTER TABLE event_meals
  ADD COLUMN composition_mode TEXT NOT NULL DEFAULT 'DEFAULT_MENU';

ALTER TABLE event_meals
  ADD CONSTRAINT event_meals_composition_mode_valid
  CHECK (composition_mode IN ('DEFAULT_MENU', 'CUSTOM'));

/* Existing explicit rows already represent customized services. */
UPDATE event_meals em
SET composition_mode = 'CUSTOM'
WHERE EXISTS (
  SELECT 1
  FROM event_meal_items emi
  WHERE emi.event_meal_id = em.id
);
