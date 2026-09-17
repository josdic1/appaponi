/* ============================================================
   016 — event household lead

   Product truth:
   - the member login belongs to the household, not one person
   - Primary remains the household's default lead/contact profile
   - each event registration can designate one attending adult as
     that event's household lead
   - this designation grants no account/authentication privileges
   ============================================================ */

ALTER TABLE event_registrations
  ADD COLUMN household_lead_attendee_id BIGINT
    REFERENCES member_attendees(id)
    ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION appoponi_validate_event_household_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  lead_account_id BIGINT;
  lead_event_id BIGINT;
  lead_role TEXT;
BEGIN
  IF NEW.household_lead_attendee_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    hm.account_id,
    ma.event_id,
    hm.member_role
  INTO
    lead_account_id,
    lead_event_id,
    lead_role
  FROM member_attendees ma
  JOIN household_members hm
    ON hm.id = ma.member_id
  WHERE ma.id = NEW.household_lead_attendee_id;

  IF lead_account_id IS NULL
     OR lead_account_id <> NEW.account_id
     OR lead_event_id <> NEW.event_id
  THEN
    RAISE EXCEPTION 'EVENT_HOUSEHOLD_LEAD_MISMATCH';
  END IF;

  IF lead_role = 'child' THEN
    RAISE EXCEPTION 'EVENT_HOUSEHOLD_LEAD_ADULT_REQUIRED';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER event_registrations_validate_household_lead
BEFORE INSERT OR UPDATE OF
  account_id,
  event_id,
  household_lead_attendee_id
ON event_registrations
FOR EACH ROW
EXECUTE FUNCTION appoponi_validate_event_household_lead();

/* Existing registrations get a sensible lead only when an adult is
   already attending. Prefer the household's Primary/default lead. */
UPDATE event_registrations er
SET household_lead_attendee_id = picked.attendee_id
FROM (
  SELECT DISTINCT ON (er2.id)
    er2.id AS registration_id,
    ma.id AS attendee_id
  FROM event_registrations er2
  JOIN member_attendees ma
    ON ma.event_id = er2.event_id
  JOIN household_members hm
    ON hm.id = ma.member_id
   AND hm.account_id = er2.account_id
  WHERE hm.member_role IN ('primary', 'adult')
  ORDER BY
    er2.id,
    CASE hm.member_role
      WHEN 'primary' THEN 0
      ELSE 1
    END,
    hm.id
) picked
WHERE picked.registration_id = er.id;
