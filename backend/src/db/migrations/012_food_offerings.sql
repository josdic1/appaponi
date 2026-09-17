/* ============================================================
   GENERIC EVENT FOOD OFFERINGS + ORDERS

   Product truth:
   - meal_items remains the one reusable food library
   - scheduled meals/receptions use event_meals
   - member-selectable food is published as an event offering
   - SNACK and AFTER_HOURS are distinct offerings over the same
     food library and the same fulfillment/order machinery
   ============================================================ */

ALTER TABLE event_after_hours_items
  RENAME TO event_food_offerings;

ALTER TABLE event_food_offerings
  ADD COLUMN offering_type TEXT NOT NULL DEFAULT 'AFTER_HOURS';

ALTER TABLE event_food_offerings
  ADD CONSTRAINT event_food_offerings_type_valid
  CHECK (offering_type IN ('SNACK', 'AFTER_HOURS'));

ALTER TABLE event_food_offerings
  DROP CONSTRAINT event_after_hours_items_event_id_item_id_key;

ALTER TABLE event_food_offerings
  ADD CONSTRAINT event_food_offerings_event_type_item_unique
  UNIQUE (event_id, offering_type, item_id);

DROP INDEX event_after_hours_items_event_idx;

CREATE INDEX event_food_offerings_event_type_idx
  ON event_food_offerings (event_id, offering_type, available, sort_order, id);

ALTER TABLE after_hours_orders
  RENAME TO food_orders;

ALTER TABLE food_orders
  ADD COLUMN offering_type TEXT NOT NULL DEFAULT 'AFTER_HOURS';

ALTER TABLE food_orders
  ADD CONSTRAINT food_orders_offering_type_valid
  CHECK (offering_type IN ('SNACK', 'AFTER_HOURS'));

ALTER TABLE after_hours_order_items
  RENAME TO food_order_items;

ALTER TABLE food_order_items
  RENAME CONSTRAINT after_hours_order_items_order_id_item_id_key
  TO food_order_items_order_id_item_id_key;

ALTER FUNCTION appoponi_validate_after_hours_order()
  RENAME TO appoponi_validate_food_order;

ALTER TRIGGER validate_after_hours_order ON food_orders
  RENAME TO validate_food_order;

CREATE INDEX food_orders_registration_type_status_idx
  ON food_orders (event_registration_id, offering_type, status, created_at DESC);
