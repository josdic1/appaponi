/* ============================================================
   CABIN MAP SLOT TRUTH
   Cabins attach to fixed, coded map buildings by stable slot id.
   Arbitrary cabin X/Y coordinates are removed.
   ============================================================ */

CREATE TABLE cabin_map_slots (
  id TEXT PRIMARY KEY
);

INSERT INTO cabin_map_slots (id)
VALUES
  ('cabin-a1'),
  ('cabin-a2'),
  ('cabin-a3'),
  ('cabin-a4'),
  ('cabin-b1'),
  ('cabin-b2'),
  ('cabin-b3'),
  ('cabin-b4'),
  ('cabin-c1'),
  ('cabin-c2'),
  ('cabin-c3'),
  ('cabin-c4'),
  ('cabin-c5'),
  ('cabin-c6'),
  ('cabin-d1'),
  ('cabin-d2'),
  ('cabin-d3'),
  ('cabin-d4');

ALTER TABLE cabins
ADD COLUMN map_slot_id TEXT
  REFERENCES cabin_map_slots(id);

/* Preserve placements created by the repaired old picker. */
WITH slot_centers (
  map_slot_id,
  map_x,
  map_y
) AS (
  VALUES
    ('cabin-a1', 0.163000, 0.297414),
    ('cabin-a2', 0.217000, 0.288793),
    ('cabin-a3', 0.271000, 0.289655),
    ('cabin-a4', 0.323000, 0.300862),
    ('cabin-b1', 0.309000, 0.346552),
    ('cabin-b2', 0.324000, 0.382759),
    ('cabin-b3', 0.333000, 0.420690),
    ('cabin-b4', 0.316000, 0.459483),
    ('cabin-c1', 0.297000, 0.643103),
    ('cabin-c2', 0.323000, 0.681897),
    ('cabin-c3', 0.350000, 0.718966),
    ('cabin-c4', 0.376000, 0.756034),
    ('cabin-c5', 0.406000, 0.791379),
    ('cabin-c6', 0.431000, 0.826724),
    ('cabin-d1', 0.372000, 0.877586),
    ('cabin-d2', 0.419000, 0.896552),
    ('cabin-d3', 0.469000, 0.914655),
    ('cabin-d4', 0.521000, 0.929310)
),
matches AS (
  SELECT
    c.id AS cabin_id,
    s.map_slot_id,
    ROW_NUMBER() OVER (
      PARTITION BY s.map_slot_id
      ORDER BY c.id
    ) AS slot_rank
  FROM cabins c
  JOIN slot_centers s
    ON ABS(c.map_x - s.map_x::REAL) <= 0.002
   AND ABS(c.map_y - s.map_y::REAL) <= 0.002
)
UPDATE cabins c
SET map_slot_id = matches.map_slot_id
FROM matches
WHERE matches.cabin_id = c.id
  AND matches.slot_rank = 1;

/* Correct the exact legacy Family Camp demo coordinates. */
UPDATE cabins c
SET map_slot_id = 'cabin-a1'
WHERE c.map_slot_id IS NULL
  AND c.name = 'Cabin 14'
  AND ABS(c.map_x - 0.27::REAL) <= 0.002
  AND ABS(c.map_y - 0.56::REAL) <= 0.002
  AND NOT EXISTS (
    SELECT 1
    FROM cabins other
    WHERE other.map_slot_id = 'cabin-a1'
  );

UPDATE cabins c
SET map_slot_id = 'cabin-a2'
WHERE c.map_slot_id IS NULL
  AND c.name = 'Cabin 15'
  AND ABS(c.map_x - 0.32::REAL) <= 0.002
  AND ABS(c.map_y - 0.63::REAL) <= 0.002
  AND NOT EXISTS (
    SELECT 1
    FROM cabins other
    WHERE other.map_slot_id = 'cabin-a2'
  );

UPDATE cabins c
SET map_slot_id = 'cabin-a3'
WHERE c.map_slot_id IS NULL
  AND c.name = 'Cabin 16'
  AND ABS(c.map_x - 0.36::REAL) <= 0.002
  AND ABS(c.map_y - 0.70::REAL) <= 0.002
  AND NOT EXISTS (
    SELECT 1
    FROM cabins other
    WHERE other.map_slot_id = 'cabin-a3'
  );

ALTER TABLE cabins
ADD CONSTRAINT cabins_map_slot_unique
UNIQUE (map_slot_id);

ALTER TABLE cabins
DROP COLUMN map_x,
DROP COLUMN map_y;
