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
  StaffMember,
  StaffRole,
} from "@appoponi/shared/schemas/staffMembers";

import {
  createStaffMember,
  loadAccounts,
  loadStaffMembers,
} from "../api/admin";

export default function AdminStaffPage() {
  const [accounts, setAccounts] =
    useState<AccountRecord[]>([]);

  const [staff, setStaff] =
    useState<StaffMember[]>([]);

  const [accountId, setAccountId] =
    useState("");

  const [fullName, setFullName] =
    useState("");

  const [role, setRole] =
    useState<StaffRole>("staff");

  const [
    babysittingEligible,
    setBabysittingEligible,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function refresh() {
    const [nextAccounts, nextStaff] =
      await Promise.all([
        loadAccounts(),
        loadStaffMembers(),
      ]);

    setAccounts(nextAccounts);
    setStaff(nextStaff);
  }

  useEffect(() => {
    void refresh().catch((err) => {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load staff",
      );
    });
  }, []);

  const availableAccounts = useMemo(() => {
    const used = new Set(
      staff
        .map((item) => item.account_id)
        .filter(Boolean),
    );

    return accounts.filter(
      (item) =>
        (item.account_type === "staff" ||
          item.account_type === "admin") &&
        !used.has(item.id),
    );
  }, [accounts, staff]);

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();
    setError(null);

    if (!accountId) {
      setError("Choose a staff account.");
      return;
    }

    try {
      await createStaffMember({
        account_id: Number(accountId),
        full_name: fullName,
        role,
        babysitting_eligible:
          babysittingEligible,
      });

      setAccountId("");
      setFullName("");
      setRole("staff");
      setBabysittingEligible(false);

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create staff profile",
      );
    }
  }

  return (
    <section>
      <div className="admin-heading">
        <div>
          <div className="admin-eyebrow">
            ADMIN
          </div>

          <h1>Staff</h1>

          <p>
            Staff profiles connect login accounts
            to camp staffing and scheduling.
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
              <strong>Create staff profile</strong>
              <span>
                Attach an existing staff login.
              </span>
            </div>
          </div>

          <form
            className="admin-form"
            onSubmit={submit}
          >
            <label>
              <span>Account</span>

              <select
                value={accountId}
                onChange={(event) =>
                  setAccountId(event.target.value)
                }
              >
                <option value="">
                  Choose staff account
                </option>

                {availableAccounts.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.username}
                  </option>
                ))}
              </select>
            </label>

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
              <span>Role</span>

              <select
                value={role}
                onChange={(event) =>
                  setRole(
                    event.target.value as StaffRole,
                  )
                }
              >
                <option value="staff">
                  Staff
                </option>

                <option value="manager">
                  Manager
                </option>
              </select>
            </label>

            <label className="admin-check">
              <input
                type="checkbox"
                checked={babysittingEligible}
                onChange={(event) =>
                  setBabysittingEligible(
                    event.target.checked,
                  )
                }
              />

              <span>
                Available for babysitting
              </span>
            </label>

            <button
              className="admin-primary"
              type="submit"
            >
              Create staff profile
            </button>
          </form>
        </section>

        <section className="admin-card admin-card-wide">
          <div className="admin-card-head">
            <div>
              <strong>Staff</strong>
              <span>{staff.length} total</span>
            </div>
          </div>

          <div className="admin-list">
            {staff.length ? (
              staff.map((item) => (
                <div
                  className="admin-list-row"
                  key={item.id}
                >
                  <span>
                    <strong>
                      {item.full_name}
                    </strong>

                    <small>
                      {item.username ??
                        "No login account"}
                      {item.babysitting_eligible
                        ? " · Babysitting"
                        : ""}
                    </small>
                  </span>

                  <b>{item.role}</b>
                </div>
              ))
            ) : (
              <div className="admin-empty">
                No staff profiles yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
