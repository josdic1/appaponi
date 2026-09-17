/* ============================================================
   ACCOUNT LOGIN / DISPLAY NAME STANDARD
   Login usernames are machine-friendly.
   Human-facing household names live separately.
   ============================================================ */

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS display_name TEXT;

UPDATE accounts
SET display_name =
  CASE
    WHEN account_type = 'member' THEN
      initcap(
        regexp_replace(
          replace(username, '_', ' '),
          '[[:space:]]+',
          ' ',
          'g'
        )
      )
    WHEN account_type = 'admin'
      AND lower(username) = 'admin'
      THEN 'Administrator'
    ELSE display_name
  END
WHERE display_name IS NULL;

UPDATE accounts a
SET display_name = sm.full_name
FROM staff_members sm
WHERE sm.account_id = a.id
  AND (
    a.display_name IS NULL
    OR a.display_name = ''
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'accounts_username_standard'
  ) THEN
    ALTER TABLE accounts
    ADD CONSTRAINT accounts_username_standard
    CHECK (
      username = lower(username)
      AND username ~ '^[a-z0-9]+([.-][a-z0-9]+)*$'
    )
    NOT VALID;
  END IF;
END
$$;
