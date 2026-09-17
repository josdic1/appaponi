ALTER TABLE events
  DROP COLUMN IF EXISTS template_id;

DROP TABLE IF EXISTS event_templates;

DROP TABLE IF EXISTS activity_others;
