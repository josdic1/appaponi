import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import type {
  AccountRecord,
} from "@appoponi/shared/schemas/accounts";

import type {
  HouseholdMember,
  MemberRole,
} from "@appoponi/shared/schemas/householdMembers";

import {
  createAccount,
  createHouseholdMember,
  loadAccounts,
  loadHouseholdMembers,
} from "../api/admin";

import { useAuth } from "../hooks/useAuth";

export default function AdminPage() {
  const { account, logout } = useAuth();

  const [accounts, setAccounts] =
    useState<AccountRecord[]>([]);

  const [members, setMembers] =
    useState<HouseholdMember[]>([]);

  const [selectedAccountId, setSelectedAccountId] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [accountType, setAccountType] =
    useState<"member" | "staff" | "admin">("member");

  const [fullName, setFullName] =
    useState("");

  const [memberRole, setMemberRole] =
    useState<MemberRole>("primary");

  async function refresh() {
    const [nextAccounts, nextMembers] =
      await Promise.all([
        loadAccounts(),
        loadHouseholdMembers(),
      ]);

    setAccounts(nextAccounts);
    setMembers(nextMembers);
  }

  useEffect(() => {
    void refresh().catch((err) => {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load admin data",
      );
    });
  }, []);

  const selectedAccount = useMemo(
    () =>
      accounts.find(
        (item) => item.id === selectedAccountId,
      ) ?? null,
    [accounts, selectedAccountId],
  );

  const selectedMembers = useMemo(
    () =>
      members.filter(
        (member) =>
          member.account_id === selectedAccountId,
      ),
    [members, selectedAccountId],
  );

  async function submitAccount(
    event: FormEvent,
  ) {
    event.preventDefault();
    setError(null);

    try {
      const created = await createAccount({
        username,
        password,
        account_type: accountType,
      });

      setUsername("");
      setPassword("");

      await refresh();

      if (created.account_type === "member") {
        setSelectedAccountId(created.id);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create account",
      );
    }
  }

  async function submitMember(
    event: FormEvent,
  ) {
    event.preventDefault();
    setError(null);

    if (!selectedAccount) {
      setError("Choose a member account.");
      return;
    }

    try {
      await createHouseholdMember({
        account_id: Number(selectedAccount.id),
        full_name: fullName,
        member_role: memberRole,
      });

      setFullName("");

      await refresh();

      if (selectedMembers.length === 0) {
        setMemberRole("adult");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not add household profile",
      );
    }
  }

  const memberAccounts = accounts.filter(
    (item) => item.account_type === "member",
  );

  return (
    <div className="admin-page">
      <header className="app-header">
        <div className="app-header-brand">
          <div className="brand-mark">A</div>
          <div>
            <strong>Appoponi</strong>
            <span>Admin</span>
          </div>
        </div>

        <div className="app-header-actions">
          <span>{account?.username}</span>

          <button
            type="button"
            onClick={() => void logout()}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-heading">
          <div>
            <div className="admin-eyebrow">
              ADMIN
            </div>
            <h1>Accounts & households</h1>
            <p>
              One member account is one household login.
              People live inside that account as profiles.
            </p>
          </div>
        </div>

        {error && (
          <div className="admin-error">
            {error}
          </div>
        )}

        <div className="admin-grid">
          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <strong>Create account</strong>
                <span>
                  Member, staff, or admin login.
                </span>
              </div>
            </div>

            <form
              className="admin-form"
              onSubmit={submitAccount}
            >
              <label>
                <span>Username</span>
                <input
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                />
              </label>

              <label>
                <span>Temporary password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                />
              </label>

              <label>
                <span>Account type</span>
                <select
                  value={accountType}
                  onChange={(event) =>
                    setAccountType(
                      event.target.value as
                        | "member"
                        | "staff"
                        | "admin",
                    )
                  }
                >
                  <option value="member">Member</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <button
                className="admin-primary"
                type="submit"
              >
                Create account
              </button>
            </form>
          </section>

          <section className="admin-card admin-card-wide">
            <div className="admin-card-head">
              <div>
                <strong>Accounts</strong>
                <span>{accounts.length} total</span>
              </div>
            </div>

            <div className="admin-list">
              {accounts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-list-row ${
                    selectedAccountId === item.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    item.account_type === "member"
                      ? setSelectedAccountId(item.id)
                      : setSelectedAccountId("")
                  }
                >
                  <span>
                    <strong>{item.username}</strong>
                    <small>
                      {item.must_change_password
                        ? "Temporary password"
                        : "Active password"}
                    </small>
                  </span>

                  <b>{item.account_type}</b>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="admin-card admin-household-card">
          <div className="admin-card-head admin-household-head">
            <div>
              <strong>Household profiles</strong>
              <span>
                Primary, Adult, and Child profiles.
              </span>
            </div>

            <select
              value={selectedAccountId}
              onChange={(event) =>
                setSelectedAccountId(event.target.value)
              }
            >
              <option value="">
                Choose member account
              </option>

              {memberAccounts.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.username}
                </option>
              ))}
            </select>
          </div>

          {selectedAccount ? (
            <div className="household-layout">
              <form
                className="admin-form"
                onSubmit={submitMember}
              >
                <label>
                  <span>Name</span>
                  <input
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Profile role</span>
                  <select
                    value={memberRole}
                    onChange={(event) =>
                      setMemberRole(
                        event.target.value as MemberRole,
                      )
                    }
                  >
                    <option value="primary">
                      Primary
                    </option>
                    <option value="adult">
                      Adult
                    </option>
                    <option value="child">
                      Child
                    </option>
                  </select>
                </label>

                <button
                  className="admin-primary"
                  type="submit"
                >
                  Add profile
                </button>
              </form>

              <div className="profile-list">
                {selectedMembers.length ? (
                  selectedMembers.map((member) => (
                    <div
                      className="profile-row"
                      key={member.id}
                    >
                      <div>
                        <strong>
                          {member.full_name}
                        </strong>
                        <span>
                          {member.member_role}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="admin-empty">
                    No profiles yet. The first profile
                    must be Primary.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="admin-empty">
              Choose a member account to manage its
              household profiles.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
