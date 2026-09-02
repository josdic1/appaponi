import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import AdminStaffPage from "./AdminStaffPage";
import AdminOperationsPage from "./AdminOperationsPage";
import AdminSchedulingPage from "./AdminSchedulingPage";
import AdminRegistrationsPage from "./AdminRegistrationsPage";
import AdminServicesPage from "./AdminServicesPage";

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
  deleteAccount,
  deleteHouseholdMember,
  loadAccounts,
  loadHouseholdMembers,
  transferHouseholdPrimary,
  updateAccount,
  updateHouseholdMember,
} from "../api/admin";

import { useAuth } from "../hooks/useAuth";

type Section =
  | "households"
  | "staff"
  | "operations"
  | "scheduling"
  | "registrations"
  | "services";

type MemberEdit = {
  full_name: string;
  email: string;
  phone: string;
  dietary_restrictions: string;
};

export default function AdminPage() {
  const { account, logout } = useAuth();

  const [accounts, setAccounts] =
    useState<AccountRecord[]>([]);

  const [members, setMembers] =
    useState<HouseholdMember[]>([]);

  const [selectedAccountId, setSelectedAccountId] =
    useState("");

  const [section, setSection] =
    useState<Section>("households");

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

  const [editingAccountId, setEditingAccountId] =
    useState<string | null>(null);

  const [editingUsername, setEditingUsername] =
    useState("");

  const [editingMemberId, setEditingMemberId] =
    useState<string | null>(null);

  const [memberEdit, setMemberEdit] =
    useState<MemberEdit>({
      full_name: "",
      email: "",
      phone: "",
      dietary_restrictions: "",
    });

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

  const currentPrimary = useMemo(
    () =>
      selectedMembers.find(
        (member) =>
          member.member_role === "primary",
      ) ?? null,
    [selectedMembers],
  );

  const memberAccounts = accounts.filter(
    (item) => item.account_type === "member",
  );

  async function run(
    action: () => Promise<unknown>,
  ) {
    setError(null);

    try {
      await action();
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Request failed",
      );
    }
  }

  async function submitAccount(
    event: FormEvent,
  ) {
    event.preventDefault();

    await run(async () => {
      const created = await createAccount({
        username,
        password,
        account_type: accountType,
      });

      setUsername("");
      setPassword("");

      if (created.account_type === "member") {
        setSelectedAccountId(created.id);
      }
    });
  }

  async function submitMember(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!selectedAccount) {
      setError("Choose a member account.");
      return;
    }

    await run(async () => {
      await createHouseholdMember({
        account_id: Number(selectedAccount.id),
        full_name: fullName,
        member_role: memberRole,
      });

      setFullName("");

      if (selectedMembers.length === 0) {
        setMemberRole("adult");
      }
    });
  }

  function beginAccountEdit(
    item: AccountRecord,
  ) {
    setEditingAccountId(item.id);
    setEditingUsername(item.username);
  }

  async function saveAccountEdit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!editingAccountId) {
      return;
    }

    await run(async () => {
      await updateAccount(
        editingAccountId,
        editingUsername,
      );
      setEditingAccountId(null);
      setEditingUsername("");
    });
  }

  function removeAccount(
    item: AccountRecord,
  ) {
    if (
      !window.confirm(
        `Delete account "${item.username}"?`,
      )
    ) {
      return;
    }

    void run(async () => {
      await deleteAccount(item.id);

      if (selectedAccountId === item.id) {
        setSelectedAccountId("");
      }
    });
  }

  function beginMemberEdit(
    member: HouseholdMember,
  ) {
    setEditingMemberId(member.id);
    setMemberEdit({
      full_name: member.full_name,
      email: member.email ?? "",
      phone: member.phone ?? "",
      dietary_restrictions:
        member.dietary_restrictions ?? "",
    });
  }

  async function saveMemberEdit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!editingMemberId) {
      return;
    }

    await run(async () => {
      await updateHouseholdMember(
        editingMemberId,
        {
          full_name: memberEdit.full_name,
          email: memberEdit.email.trim()
            ? memberEdit.email.trim()
            : null,
          phone: memberEdit.phone.trim()
            ? memberEdit.phone.trim()
            : null,
          dietary_restrictions:
            memberEdit.dietary_restrictions.trim()
              ? memberEdit.dietary_restrictions.trim()
              : null,
        },
      );

      setEditingMemberId(null);
    });
  }

  function removeMember(
    member: HouseholdMember,
  ) {
    if (
      !window.confirm(
        `Delete ${member.full_name}?`,
      )
    ) {
      return;
    }

    void run(async () => {
      await deleteHouseholdMember(member.id);

      if (editingMemberId === member.id) {
        setEditingMemberId(null);
      }
    });
  }

  function makePrimary(
    member: HouseholdMember,
  ) {
    if (!currentPrimary) {
      setError(
        "This household has no current Primary.",
      );
      return;
    }

    if (
      !window.confirm(
        `Make ${member.full_name} the Primary?`,
      )
    ) {
      return;
    }

    void run(() =>
      transferHouseholdPrimary(
        currentPrimary.id,
        member.id,
      ),
    );
  }

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

      <nav className="admin-tabs">
        <button
          type="button"
          className={section === "households" ? "active" : ""}
          onClick={() => setSection("households")}
        >
          Accounts & Households
        </button>

        <button
          type="button"
          className={section === "staff" ? "active" : ""}
          onClick={() => setSection("staff")}
        >
          Staff
        </button>

        <button
          type="button"
          className={section === "operations" ? "active" : ""}
          onClick={() => setSection("operations")}
        >
          Operations
        </button>

        <button
          type="button"
          className={section === "scheduling" ? "active" : ""}
          onClick={() => setSection("scheduling")}
        >
          Scheduling
        </button>

        <button
          type="button"
          className={section === "registrations" ? "active" : ""}
          onClick={() => setSection("registrations")}
        >
          Registrations
        </button>

        <button
          type="button"
          className={section === "services" ? "active" : ""}
          onClick={() => setSection("services")}
        >
          Services
        </button>
      </nav>

      <main className="admin-main">
        {section === "staff" ? (
          <AdminStaffPage />
        ) : section === "operations" ? (
          <AdminOperationsPage />
        ) : section === "scheduling" ? (
          <AdminSchedulingPage />
        ) : section === "registrations" ? (
          <AdminRegistrationsPage />
        ) : section === "services" ? (
          <AdminServicesPage />
        ) : (
          <>
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
                  {accounts.map((item) =>
                    editingAccountId === item.id ? (
                      <form
                        className="admin-inline-edit"
                        key={item.id}
                        onSubmit={saveAccountEdit}
                      >
                        <input
                          aria-label="Username"
                          value={editingUsername}
                          onChange={(event) =>
                            setEditingUsername(
                              event.target.value,
                            )
                          }
                        />

                        <div className="admin-row-actions">
                          <button
                            className="admin-secondary-button"
                            type="submit"
                          >
                            Save
                          </button>

                          <button
                            className="admin-delete-button"
                            type="button"
                            onClick={() =>
                              setEditingAccountId(null)
                            }
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div
                        key={item.id}
                        className={`admin-list-row admin-manage-row ${
                          selectedAccountId === item.id
                            ? "active"
                            : ""
                        }`}
                      >
                        <button
                          className="admin-row-main"
                          type="button"
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

                        <div className="admin-row-actions">
                          <button
                            className="admin-secondary-button"
                            type="button"
                            onClick={() =>
                              beginAccountEdit(item)
                            }
                          >
                            Edit
                          </button>

                          {item.id !== account?.id && (
                            <button
                              className="admin-delete-button"
                              type="button"
                              onClick={() =>
                                removeAccount(item)
                              }
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ),
                  )}
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
                      selectedMembers.map((member) =>
                        editingMemberId === member.id ? (
                          <form
                            className="profile-row profile-edit-row"
                            key={member.id}
                            onSubmit={saveMemberEdit}
                          >
                            <div className="admin-edit-fields">
                              <input
                                aria-label="Name"
                                value={memberEdit.full_name}
                                onChange={(event) =>
                                  setMemberEdit((current) => ({
                                    ...current,
                                    full_name: event.target.value,
                                  }))
                                }
                              />

                              <input
                                aria-label="Email"
                                placeholder="Email"
                                value={memberEdit.email}
                                onChange={(event) =>
                                  setMemberEdit((current) => ({
                                    ...current,
                                    email: event.target.value,
                                  }))
                                }
                              />

                              <input
                                aria-label="Phone"
                                placeholder="Phone"
                                value={memberEdit.phone}
                                onChange={(event) =>
                                  setMemberEdit((current) => ({
                                    ...current,
                                    phone: event.target.value,
                                  }))
                                }
                              />

                              <input
                                aria-label="Dietary restrictions"
                                placeholder="Dietary restrictions"
                                value={memberEdit.dietary_restrictions}
                                onChange={(event) =>
                                  setMemberEdit((current) => ({
                                    ...current,
                                    dietary_restrictions:
                                      event.target.value,
                                  }))
                                }
                              />
                            </div>

                            <div className="admin-row-actions">
                              <button
                                className="admin-secondary-button"
                                type="submit"
                              >
                                Save
                              </button>

                              <button
                                className="admin-delete-button"
                                type="button"
                                onClick={() =>
                                  setEditingMemberId(null)
                                }
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div
                            className="profile-row profile-manage-row"
                            key={member.id}
                          >
                            <div>
                              <strong>
                                {member.full_name}
                              </strong>
                              <span>
                                {member.member_role}
                                {member.email
                                  ? ` · ${member.email}`
                                  : ""}
                              </span>
                            </div>

                            <div className="admin-row-actions">
                              {member.member_role === "adult" &&
                                currentPrimary && (
                                  <button
                                    className="admin-secondary-button"
                                    type="button"
                                    onClick={() =>
                                      makePrimary(member)
                                    }
                                  >
                                    Make primary
                                  </button>
                                )}

                              <button
                                className="admin-secondary-button"
                                type="button"
                                onClick={() =>
                                  beginMemberEdit(member)
                                }
                              >
                                Edit
                              </button>

                              <button
                                className="admin-delete-button"
                                type="button"
                                onClick={() =>
                                  removeMember(member)
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ),
                      )
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
          </>
        )}
      </main>
    </div>
  );
}
