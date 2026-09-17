/* ============================================================
   STABLE ACTIVITY -> VECTOR MAP PLACE IDS

   Product truth:
   - vector map geometry is fixed application reference data
   - activities point to stable map component ids
   - member itinerary navigation never guesses from display names
   - obsolete arbitrary area coordinates are removed
   ============================================================ */

ALTER TABLE activities
  ADD COLUMN map_place_id TEXT;

ALTER TABLE activities
  ADD CONSTRAINT activities_map_place_id_valid
  CHECK (
    map_place_id IS NULL
    OR map_place_id IN (
      'camp-fire',
      'field',
      'mini-ropes',
      'rec-hall',
      'barn',
      'riding',
      'tennis',
      'dining-hall',
      'arch-loons-house',
      'lower-lodge',
      'office',
      'gymnastics',
      'boat-shed',
      'waterfront',
      'your-cabin'
    )
  );

/* One-time conversion of the old runtime name matcher.
   After this migration, runtime navigation uses map_place_id only. */
UPDATE activities a
SET map_place_id = CASE
  WHEN LOWER(a.name) LIKE '%rest hour%'
    OR LOWER(ar.name) LIKE '%lodging%'
    OR LOWER(ar.name) LIKE '%cabin%'
    THEN 'your-cabin'
  WHEN LOWER(a.name) LIKE '%gymnastics%'
    THEN 'gymnastics'
  WHEN LOWER(a.name) LIKE '%pickleball%'
    OR LOWER(a.name) LIKE '%tennis%'
    THEN 'tennis'
  WHEN LOWER(a.name) LIKE '%campfire%'
    OR LOWER(a.name) LIKE '%s''more%'
    THEN 'camp-fire'
  WHEN LOWER(a.name) LIKE '%waterski%'
    OR LOWER(a.name) LIKE '%waterfront%'
    OR LOWER(ar.name) LIKE '%waterfront%'
    THEN 'waterfront'
  WHEN LOWER(a.name) LIKE '%arrival%'
    OR LOWER(a.name) LIKE '%departure%'
    OR LOWER(ar.name) LIKE '%guest services%'
    THEN 'office'
  WHEN LOWER(a.name) LIKE '%color war%'
    OR LOWER(a.name) LIKE '%carnival%'
    OR LOWER(a.name) LIKE '%mostest%'
    OR LOWER(a.name) LIKE '%activities open%'
    OR LOWER(ar.name) LIKE '%athletics%'
    OR LOWER(ar.name) LIKE '%general events%'
    THEN 'field'
  ELSE NULL
END
FROM areas ar
WHERE ar.id = a.area_id;

ALTER TABLE areas
  DROP COLUMN map_x,
  DROP COLUMN map_y;
