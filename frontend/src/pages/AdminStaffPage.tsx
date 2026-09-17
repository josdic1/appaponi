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

import type {
  StaffQualification,
} from "@appoponi/shared/schemas/scheduling";

import {
  createStaffMember,
  deleteStaffMember,
  loadAccounts,
  loadStaffMembers,
  updateStaffMember,
} from "../api/admin";

import {
  loadScheduling,
} from "../api/scheduling";

export default function AdminStaffPage() {
  const [accounts, setAccounts] =
    useState<AccountRecord[]>([]);

  const [staff, setStaff] =
    useState<StaffMember[]>([]);

  const [
    staffQualifications,
    setStaffQualifications,
  ] = useState<StaffQualification[]>([]);

  const [accountId, setAccountId] =
    useState("");

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [role, setRole] =
    useState<StaffRole>("staff");

  const [
    babysittingEligible,
    setBabysittingEligible,
  ] = useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [editFullName, setEditFullName] =
    useState("");

  const [editEmail, setEditEmail] =
    useState("");

  const [editPhone, setEditPhone] =
    useState("");

  const [editRole, setEditRole] =
    useState<StaffRole>("staff");

  const [
    editBabysittingEligible,
    setEditBabysittingEligible,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function refresh() {
    const [
      nextAccounts,
      nextStaff,
      scheduling,
    ] = await Promise.all([
      loadAccounts(),
      loadStaffMembers(),
      loadScheduling(),
    ]);

    setAccounts(nextAccounts);
    setStaff(nextStaff);
    setStaffQualifications(
      scheduling.staffQualifications,
    );
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
        item.account_type === "staff" &&
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
        ...(email.trim()
          ? { email: email.trim() }
          : {}),
        ...(phone.trim()
          ? { phone: phone.trim() }
          : {}),
        role,
        babysitting_eligible:
          babysittingEligible,
      });

      setAccountId("");
      setFullName("");
      setEmail("");
      setPhone("");
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

  function beginEdit(
    item: StaffMember,
  ) {
    setEditingId(item.id);
    setEditFullName(item.full_name);
    setEditEmail(item.email ?? "");
    setEditPhone(item.phone ?? "");
    setEditRole(item.role);
    setEditBabysittingEligible(
      item.babysitting_eligible,
    );
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function saveEdit(
    event: FormEvent,
    id: string,
  ) {
    event.preventDefault();
    setError(null);

    try {
      await updateStaffMember(id, {
        full_name: editFullName,
        email:
          editEmail.trim() || null,
        phone:
          editPhone.trim() || null,
        role: editRole,
        babysitting_eligible:
          editBabysittingEligible,
      });

      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update staff profile",
      );
    }
  }

  async function remove(
    item: StaffMember,
  ) {
    if (
      !window.confirm(
        `Delete staff profile "${item.full_name}"?`,
      )
    ) {
      return;
    }

    setError(null);

    try {
      await deleteStaffMember(item.id);

      if (editingId === item.id) {
        setEditingId(null);
      }

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete staff profile",
      );
    }
  }

  function initials(
    name: string,
  ) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part[0]?.toUpperCase() ??
          "",
      )
      .join("");
  }

  function qualificationsFor(
    staffMemberId: string,
  ) {
    return staffQualifications
      .filter(
        (item) =>
          item.staff_member_id ===
          staffMemberId,
      )
      .map(
        (item) =>
          item.qualification_name,
      );
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
        <div className="app-alert app-alert-danger">
          {error}
        </div>
      )}

      <div
        className={
          availableAccounts.length
            ? "admin-grid staff-admin-grid"
            : "staff-admin-single"
        }
      >
        {availableAccounts.length > 0 && (
        <section className="app-card">
          <div className="app-card-head">
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
                onChange={(event) => {
                  const nextId =
                    event.target.value;

                  setAccountId(nextId);

                  const account =
                    availableAccounts.find(
                      (item) =>
                        item.id === nextId,
                    );

                  if (
                    account?.display_name
                  ) {
                    setFullName(
                      account.display_name,
                    );
                  }
                }}
              >
                <option value="">
                  Choose staff account
                </option>

                {availableAccounts.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.display_name ??
                      item.username}
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
              <span>Email</span>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
              />
            </label>

            <label>
              <span>Phone</span>

              <input
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
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
              className="app-button app-button-primary"
              type="submit"
            >
              Create staff profile
            </button>
          </form>
        </section>
        )}

        <section className="app-card staff-directory-card">
          <div className="app-card-head">
            <div>
              <strong>Staff</strong>
              <span>{staff.length} total</span>
            </div>
          </div>

          <div className="admin-list">
            {staff.length ? (
              staff.map((item) =>
                editingId === item.id ? (
                  <form
                    className="admin-list-row profile-edit-row"
                    key={item.id}
                    onSubmit={(event) =>
                      void saveEdit(
                        event,
                        item.id,
                      )
                    }
                  >
                    <div className="admin-edit-fields">
                      <input
                        aria-label="Staff name"
                        value={editFullName}
                        onChange={(event) =>
                          setEditFullName(
                            event.target.value,
                          )
                        }
                      />

                      <input
                        aria-label="Staff email"
                        type="email"
                        placeholder="Email"
                        value={editEmail}
                        onChange={(event) =>
                          setEditEmail(
                            event.target.value,
                          )
                        }
                      />

                      <input
                        aria-label="Staff phone"
                        placeholder="Phone"
                        value={editPhone}
                        onChange={(event) =>
                          setEditPhone(
                            event.target.value,
                          )
                        }
                      />

                      <select
                        aria-label="Staff role"
                        value={editRole}
                        onChange={(event) =>
                          setEditRole(
                            event.target
                              .value as StaffRole,
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

                      <label className="admin-check">
                        <input
                          type="checkbox"
                          checked={
                            editBabysittingEligible
                          }
                          onChange={(event) =>
                            setEditBabysittingEligible(
                              event.target.checked,
                            )
                          }
                        />

                        <span>
                          Babysitting
                        </span>
                      </label>
                    </div>

                    <div className="admin-row-actions">
                      <button
                        className="app-button"
                        type="submit"
                      >
                        Save
                      </button>

                      <button
                        className="app-button"
                        type="button"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div
                    className="staff-directory-row"
                    key={item.id}
                  >
                    <div className="staff-directory-person">
                      <span className="staff-directory-avatar">
                        {initials(
                          item.full_name,
                        )}
                      </span>

                      <div>
                        <strong>
                          {item.full_name}
                        </strong>

                        <small>
                          {item.username
                            ? `@${item.username}`
                            : "No login account"}
                        </small>
                      </div>
                    </div>

                    <div className="staff-directory-chips">
                      <span className="staff-directory-chip role">
                        {item.role === "manager"
                          ? "Manager"
                          : "Staff"}
                      </span>

                      {item.babysitting_eligible && (
                        <span className="staff-directory-chip">
                          Babysitting
                        </span>
                      )}

                      {qualificationsFor(
                        item.id,
                      ).map(
                        (qualification) => (
                          <span
                            className="staff-directory-chip"
                            key={
                              qualification
                            }
                          >
                            {
                              qualification
                            }
                          </span>
                        ),
                      )}
                    </div>

                    <div className="staff-directory-contact">
                      {item.email && (
                        <span>
                          {item.email}
                        </span>
                      )}

                      {item.phone && (
                        <span>
                          {item.phone}
                        </span>
                      )}
                    </div>

                    <div className="admin-row-actions staff-directory-actions">
                      <button
                        className="app-button"
                        type="button"
                        onClick={() =>
                          beginEdit(item)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="app-button app-button-danger"
                        type="button"
                        onClick={() =>
                          void remove(item)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ),
              )
            ) : (
              <div className="app-empty">
                No staff profiles yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
