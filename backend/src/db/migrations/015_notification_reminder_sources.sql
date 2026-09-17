/* ============================================================
   015 — notification reminder sources

   Automatic activity / meal reminders need a stable source so a
   schedule edit updates the same reminder instead of creating copies.
   ============================================================ */

ALTER TABLE notifications
  ADD COLUMN source_type TEXT,
  ADD COLUMN source_id BIGINT;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_source_type_check
  CHECK (
    source_type IS NULL
    OR source_type IN (
      'event_activity',
      'event_meal'
    )
  );

ALTER TABLE notifications
  ADD CONSTRAINT notifications_source_pair_check
  CHECK (
    (source_type IS NULL AND source_id IS NULL)
    OR (source_type IS NOT NULL AND source_id IS NOT NULL)
  );

CREATE UNIQUE INDEX notifications_source_unique_idx
ON notifications (
  account_id,
  source_type,
  source_id
)
WHERE source_type IS NOT NULL;
