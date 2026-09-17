-- Activity attendance is a one-way present/not-present fact.
-- Camp departure is modeled by the separate scheduled Departure activity,
-- not by checking participants out of every activity.
ALTER TABLE event_activity_signups
  DROP COLUMN checked_out_at;
