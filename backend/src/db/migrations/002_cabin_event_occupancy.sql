/* ============================================================
   CABIN OCCUPANCY BACKSTOP
   A cabin cannot be assigned to overlapping events.
   ============================================================ */

CREATE OR REPLACE FUNCTION prevent_cabin_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cabin_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM event_registrations other
    JOIN events other_event
      ON other_event.id = other.event_id
    JOIN events new_event
      ON new_event.id = NEW.event_id
    WHERE other.cabin_id = NEW.cabin_id
      AND other.id IS DISTINCT FROM NEW.id
      AND new_event.starts_at < other_event.ends_at
      AND other_event.starts_at < new_event.ends_at
  ) THEN
    RAISE EXCEPTION 'CABIN_OCCUPIED'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS event_registrations_cabin_overlap_guard
ON event_registrations;

CREATE TRIGGER event_registrations_cabin_overlap_guard
BEFORE INSERT OR UPDATE OF cabin_id, event_id
ON event_registrations
FOR EACH ROW
EXECUTE FUNCTION prevent_cabin_overlap();
