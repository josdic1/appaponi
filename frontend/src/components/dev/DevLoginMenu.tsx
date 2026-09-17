import {
  useEffect,
  useState,
} from "react";

import type {
  AccountType,
} from "@appoponi/shared/schemas/auth";

import {
  devLogin,
  getDevAccounts,
  type DevAccount,
} from "../../api/dev";

import { useAuth } from "../../hooks/useAuth";

const categories: Array<{
  type: AccountType;
  label: string;
}> = [
  { type: "member", label: "Members" },
  { type: "staff", label: "Staff" },
  { type: "admin", label: "Admins" },
];

export default function DevLoginMenu() {
  const { refresh } = useAuth();

  const [open, setOpen] =
    useState(false);

  const [accounts, setAccounts] =
    useState<DevAccount[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [switching, setSwitching] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoading(true);
    setError(null);

    getDevAccounts()
      .then(setAccounts)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Could not load accounts",
        ),
      )
      .finally(() =>
        setLoading(false),
      );
  }, [open]);

  async function switchAccount(
    account: DevAccount,
  ) {
    setSwitching(account.id);
    setError(null);

    try {
      await devLogin(account.id);
      await refresh();
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Development login failed",
      );
    } finally {
      setSwitching(null);
    }
  }

  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="dev-login-menu">
      <button
        type="button"
        className="dev-login-trigger"
        onClick={() =>
          setOpen(
            (current) => !current,
          )
        }
      >
        DEV LOGIN
        <span>{open ? "×" : "↓"}</span>
      </button>

      {open && (
        <div className="dev-login-panel">
          {loading ? (
            <div className="dev-login-loading">
              Loading users…
            </div>
          ) : error ? (
            <div className="dev-login-error">
              {error}
            </div>
          ) : (
            categories.map(
              (category) => {
                const rows =
                  accounts.filter(
                    (account) =>
                      account.account_type ===
                      category.type,
                  );

                if (!rows.length) {
                  return null;
                }

                return (
                  <div
                    className="dev-login-category"
                    key={category.type}
                  >
                    <div className="dev-login-category-label">
                      {category.label}
                    </div>

                    <div className="dev-login-user-list">
                      {rows.map(
                        (account) => (
                          <button
                            type="button"
                            className="dev-login-user"
                            key={account.id}
                            disabled={
                              switching !==
                              null
                            }
                            onClick={() =>
                              void switchAccount(
                                account,
                              )
                            }
                          >
                            <span className="dev-login-user-name">
                              <strong>
                                {account.display_name ??
                                  account.username}
                              </strong>

                              <small>
                                @{account.username}
                              </small>
                            </span>

                            {account.must_change_password && (
                              <small>
                                setup
                              </small>
                            )}

                            {switching ===
                              account.id && (
                              <span className="dev-login-switching">
                                …
                              </span>
                            )}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                );
              },
            )
          )}
        </div>
      )}
    </div>
  );
}
