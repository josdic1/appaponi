/* ============================================================
   REMOVE LEGACY FAMILY CAMP MENU SHELLS

   Product truth:
   - Family Camp uses one reusable "Family Camp Menu"
   - old per-meal menu shells are obsolete
   ============================================================ */

UPDATE events e
SET meal_menu_id = canonical.id
FROM meal_menus canonical
WHERE canonical.name = 'Family Camp Menu'
  AND e.name = 'Family Camp 2026'
  AND e.meal_menu_id IN (
    SELECT legacy.id
    FROM meal_menus legacy
    WHERE legacy.name IN (
      'Family Camp Breakfast',
      'Family Camp Lunch',
      'Family Camp Dinner'
    )
  );

DELETE FROM meal_menu_items mmi
USING meal_menus legacy
WHERE mmi.menu_id = legacy.id
  AND legacy.name IN (
    'Family Camp Breakfast',
    'Family Camp Lunch',
    'Family Camp Dinner'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM events e
    WHERE e.meal_menu_id = legacy.id
  );

DELETE FROM meal_menus legacy
WHERE legacy.name IN (
    'Family Camp Breakfast',
    'Family Camp Lunch',
    'Family Camp Dinner'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM events e
    WHERE e.meal_menu_id = legacy.id
  );
