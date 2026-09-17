ALTER TABLE accounts
  ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1
  CHECK (session_version >= 1);
