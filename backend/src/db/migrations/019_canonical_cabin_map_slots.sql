/* ============================================================
   CANONICAL REUSABLE CABIN MAP
   Each lodging record owns one permanent physical map structure.
   Event registrations may assign a household to lodging, but may
   not redefine the physical lodging location.
   ============================================================ */

INSERT INTO cabin_map_slots (id)
VALUES
  ('cabin-1'),
  ('cabin-2'),
  ('cabin-3'),
  ('cabin-4'),
  ('cabin-5'),
  ('cabin-6'),
  ('cabin-7'),
  ('cabin-8'),
  ('cabin-9'),
  ('cabin-10'),
  ('cabin-11'),
  ('cabin-12'),
  ('cabin-13'),
  ('cabin-14'),
  ('cabin-15'),
  ('cabin-16'),
  ('cabin-17'),
  ('cabin-18'),
  ('cabin-19'),
  ('cabin-20'),
  ('cabin-21'),
  ('cabin-22'),
  ('cabin-23'),
  ('cabin-24'),
  ('cabin-25'),
  ('cabin-26'),
  ('cabin-27'),
  ('cabin-28'),
  ('cabin-29'),
  ('cabin-30'),
  ('cabin-31'),
  ('cabin-32'),
  ('the-hilton'),
  ('the-hyatt'),
  ('the-beehive')
ON CONFLICT (id) DO NOTHING;

UPDATE cabins
SET map_slot_id = NULL
WHERE map_slot_id IN (
  'cabin-a1', 'cabin-a2', 'cabin-a3', 'cabin-a4',
  'cabin-b1', 'cabin-b2', 'cabin-b3', 'cabin-b4',
  'cabin-c1', 'cabin-c2', 'cabin-c3', 'cabin-c4',
  'cabin-c5', 'cabin-c6',
  'cabin-d1', 'cabin-d2', 'cabin-d3', 'cabin-d4'
);

UPDATE cabins AS c
SET map_slot_id = preset.map_slot_id
FROM (
  VALUES
    ('Cabin 1', 'cabin-1'),
    ('Cabin 2', 'cabin-2'),
    ('Cabin 3', 'cabin-3'),
    ('Cabin 4', 'cabin-4'),
    ('Cabin 5', 'cabin-5'),
    ('Cabin 6', 'cabin-6'),
    ('Cabin 7', 'cabin-7'),
    ('Cabin 8', 'cabin-8'),
    ('Cabin 9', 'cabin-9'),
    ('Cabin 10', 'cabin-10'),
    ('Cabin 11', 'cabin-11'),
    ('Cabin 12', 'cabin-12'),
    ('Cabin 13', 'cabin-13'),
    ('Cabin 14', 'cabin-14'),
    ('Cabin 15', 'cabin-15'),
    ('Cabin 16', 'cabin-16'),
    ('Cabin 17', 'cabin-17'),
    ('Cabin 18', 'cabin-18'),
    ('Cabin 19', 'cabin-19'),
    ('Cabin 20', 'cabin-20'),
    ('Cabin 21', 'cabin-21'),
    ('Cabin 22', 'cabin-22'),
    ('Cabin 23', 'cabin-23'),
    ('Cabin 24', 'cabin-24'),
    ('Cabin 25', 'cabin-25'),
    ('Cabin 26', 'cabin-26'),
    ('Cabin 27', 'cabin-27'),
    ('Cabin 28', 'cabin-28'),
    ('Cabin 29', 'cabin-29'),
    ('Cabin 30', 'cabin-30'),
    ('Cabin 31', 'cabin-31'),
    ('Cabin 32', 'cabin-32'),
    ('The Hilton', 'the-hilton'),
    ('The Hyatt', 'the-hyatt'),
    ('The Beehive', 'the-beehive')
) AS preset(name, map_slot_id)
WHERE c.name = preset.name;

DELETE FROM cabin_map_slots
WHERE id IN (
  'cabin-a1', 'cabin-a2', 'cabin-a3', 'cabin-a4',
  'cabin-b1', 'cabin-b2', 'cabin-b3', 'cabin-b4',
  'cabin-c1', 'cabin-c2', 'cabin-c3', 'cabin-c4',
  'cabin-c5', 'cabin-c6',
  'cabin-d1', 'cabin-d2', 'cabin-d3', 'cabin-d4'
);
