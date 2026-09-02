DROP TABLE account_households;

ALTER TABLE households
ADD COLUMN account_id BIGINT NOT NULL
  REFERENCES accounts(id)
  ON DELETE CASCADE;

CREATE UNIQUE INDEX households_one_account
ON households (account_id);
