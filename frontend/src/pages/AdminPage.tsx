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
  resetAccountPassword,
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

  const [
    resettingAccountId,
    setResettingAccountId,
  ] = useState<string | null>(null);

  const [
    temporaryPassword,
    setTemporaryPassword,
  ] = useState("");

  const [
    showCreateAccount,
    setShowCreateAccount,
  ] = useState(false);

  const [
    showAddProfile,
    setShowAddProfile,
  ] = useState(false);

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
      setShowCreateAccount(false);
      setSelectedAccountId(created.id);
    });
  }

  async function submitMember(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !selectedAccount ||
      selectedAccount.account_type !== "member"
    ) {
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
      setShowAddProfile(false);

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

  function beginPasswordReset(
    item: AccountRecord,
  ) {
    setResettingAccountId(item.id);
    setTemporaryPassword("");
    setEditingAccountId(null);
    setError(null);
  }

  async function savePasswordReset(
    event: FormEvent,
    id: string,
  ) {
    event.preventDefault();

    if (!temporaryPassword) {
      setError(
        "Temporary password is required.",
      );
      return;
    }

    await run(async () => {
      await resetAccountPassword(
        id,
        temporaryPassword,
      );

      setResettingAccountId(null);
      setTemporaryPassword("");
    });
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
            <div className="admin-heading accounts-heading">
              <div>
                <div className="admin-eyebrow">
                  ADMIN
                </div>

                <h1>Accounts & households</h1>

                <p>
                  Manage logins and the people inside each
                  member household.
                </p>
              </div>

              <button
                className="admin-primary-button"
                type="button"
                onClick={() =>
                  setShowCreateAccount(
                    (current) => !current,
                  )
                }
              >
                {showCreateAccount
                  ? "Close"
                  : "New account"}
              </button>
            </div>

            {error && (
              <div className="admin-error">
                {error}
              </div>
            )}

            {showCreateAccount && (
              <section className="admin-card account-create-drawer">
                <div className="account-create-head">
                  <div>
                    <strong>New account</strong>
                    <span>
                      Creates a login. Member profiles are
                      added after the account exists.
                    </span>
                  </div>
                </div>

                <form
                  className="account-create-grid"
                  onSubmit={submitAccount}
                >
                  <label>
                    <span>Username</span>
                    <input
                      autoFocus
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
                      autoComplete="new-password"
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

                  <div className="account-create-actions">
                    <button
                      className="admin-secondary-button"
                      type="button"
                      onClick={() => {
                        setShowCreateAccount(false);
                        setUsername("");
                        setPassword("");
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      className="admin-primary-button"
                      type="submit"
                    >
                      Create account
                    </button>
                  </div>
                </form>
              </section>
            )}

            <div className="account-workspace">
              <section className="admin-card account-directory">
                <div className="account-directory-head">
                  <div>
                    <strong>Accounts</strong>
                    <span>{accounts.length} total</span>
                  </div>
                </div>

                <div className="account-directory-list">
                  {accounts.map((item) => (
                    <button
                      className={`account-directory-row ${
                        selectedAccountId === item.id
                          ? "active"
                          : ""
                      }`}
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedAccountId(item.id);
                        setEditingAccountId(null);
                        setResettingAccountId(null);
                        setEditingMemberId(null);
                        setShowAddProfile(false);
                      }}
                    >
                      <span className="account-directory-main">
                        <strong>{item.username}</strong>
                        <small>
                          {item.must_change_password
                            ? "Password change required"
                            : "Active"}
                        </small>
                      </span>

                      <span
                        className={`account-type-pill ${item.account_type}`}
                      >
                        {item.account_type}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="admin-card account-detail">
                {selectedAccount ? (
                  <>
                    <div className="account-detail-head">
                      <div className="account-detail-title">
                        <span>
                          {selectedAccount.account_type ===
                          "member"
                            ? "MEMBER HOUSEHOLD"
                            : `${selectedAccount.account_type.toUpperCase()} ACCOUNT`}
                        </span>

                        <h2>{selectedAccount.username}</h2>

                        <p>
                          {selectedAccount.must_change_password
                            ? "Temporary password — change required at next sign in."
                            : "Password active."}
                        </p>
                      </div>

                      <div className="account-detail-actions">
                        <button
                          className="admin-secondary-button"
                          type="button"
                          onClick={() =>
                            beginAccountEdit(
                              selectedAccount,
                            )
                          }
                        >
                          Edit login
                        </button>

                        {selectedAccount.id !== account?.id && (
                          <>
                            <button
                              className="admin-secondary-button"
                              type="button"
                              onClick={() =>
                                beginPasswordReset(
                                  selectedAccount,
                                )
                              }
                            >
                              Reset password
                            </button>

                            <button
                              className="admin-delete-button"
                              type="button"
                              onClick={() =>
                                removeAccount(
                                  selectedAccount,
                                )
                              }
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {editingAccountId ===
                      selectedAccount.id && (
                      <form
                        className="account-detail-tool"
                        onSubmit={saveAccountEdit}
                      >
                        <label>
                          <span>Username</span>

                          <input
                            autoFocus
                            value={editingUsername}
                            onChange={(event) =>
                              setEditingUsername(
                                event.target.value,
                              )
                            }
                          />
                        </label>

                        <div className="admin-row-actions">
                          <button
                            className="admin-primary-button"
                            type="submit"
                          >
                            Save
                          </button>

                          <button
                            className="admin-secondary-button"
                            type="button"
                            onClick={() =>
                              setEditingAccountId(null)
                            }
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}

                    {resettingAccountId ===
                      selectedAccount.id && (
                      <form
                        className="account-detail-tool"
                        onSubmit={(event) =>
                          void savePasswordReset(
                            event,
                            selectedAccount.id,
                          )
                        }
                      >
                        <label>
                          <span>
                            New temporary password
                          </span>

                          <input
                            autoFocus
                            type="password"
                            autoComplete="new-password"
                            value={temporaryPassword}
                            onChange={(event) =>
                              setTemporaryPassword(
                                event.target.value,
                              )
                            }
                          />
                        </label>

                        <div className="admin-row-actions">
                          <button
                            className="admin-primary-button"
                            type="submit"
                          >
                            Reset password
                          </button>

                          <button
                            className="admin-secondary-button"
                            type="button"
                            onClick={() => {
                              setResettingAccountId(null);
                              setTemporaryPassword("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}

                    {selectedAccount.account_type ===
                    "member" ? (
                      <div className="household-detail">
                        <div className="household-section-head">
                          <div>
                            <strong>People</strong>
                            <span>
                              {selectedMembers.length}{" "}
                              {selectedMembers.length === 1
                                ? "profile"
                                : "profiles"}
                            </span>
                          </div>

                          <button
                            className="admin-secondary-button"
                            type="button"
                            onClick={() =>
                              setShowAddProfile(
                                (current) => !current,
                              )
                            }
                          >
                            {showAddProfile
                              ? "Close"
                              : "Add person"}
                          </button>
                        </div>

                        {showAddProfile && (
                          <form
                            className="profile-add-form"
                            onSubmit={submitMember}
                          >
                            <label>
                              <span>Name</span>

                              <input
                                autoFocus
                                value={fullName}
                                onChange={(event) =>
                                  setFullName(
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>Role</span>

                              <select
                                value={memberRole}
                                onChange={(event) =>
                                  setMemberRole(
                                    event.target
                                      .value as MemberRole,
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

                            <div className="profile-add-actions">
                              <button
                                className="admin-secondary-button"
                                type="button"
                                onClick={() => {
                                  setShowAddProfile(false);
                                  setFullName("");
                                }}
                              >
                                Cancel
                              </button>

                              <button
                                className="admin-primary-button"
                                type="submit"
                              >
                                Add person
                              </button>
                            </div>
                          </form>
                        )}

                        <div className="profile-list account-profile-list">
                          {selectedMembers.length ? (
                            selectedMembers.map(
                              (member) =>
                                editingMemberId ===
                                member.id ? (
                                  <form
                                    className="profile-row profile-edit-row account-profile-edit"
                                    key={member.id}
                                    onSubmit={saveMemberEdit}
                                  >
                                    <div className="admin-edit-fields">
                                      <input
                                        aria-label="Name"
                                        value={
                                          memberEdit.full_name
                                        }
                                        onChange={(event) =>
                                          setMemberEdit(
                                            (current) => ({
                                              ...current,
                                              full_name:
                                                event.target
                                                  .value,
                                            }),
                                          )
                                        }
                                      />

                                      <input
                                        aria-label="Email"
                                        placeholder="Email"
                                        value={
                                          memberEdit.email
                                        }
                                        onChange={(event) =>
                                          setMemberEdit(
                                            (current) => ({
                                              ...current,
                                              email:
                                                event.target
                                                  .value,
                                            }),
                                          )
                                        }
                                      />

                                      <input
                                        aria-label="Phone"
                                        placeholder="Phone"
                                        value={
                                          memberEdit.phone
                                        }
                                        onChange={(event) =>
                                          setMemberEdit(
                                            (current) => ({
                                              ...current,
                                              phone:
                                                event.target
                                                  .value,
                                            }),
                                          )
                                        }
                                      />

                                      <input
                                        aria-label="Dietary restrictions"
                                        placeholder="Dietary restrictions"
                                        value={
                                          memberEdit.dietary_restrictions
                                        }
                                        onChange={(event) =>
                                          setMemberEdit(
                                            (current) => ({
                                              ...current,
                                              dietary_restrictions:
                                                event.target
                                                  .value,
                                            }),
                                          )
                                        }
                                      />
                                    </div>

                                    <div className="admin-row-actions">
                                      <button
                                        className="admin-primary-button"
                                        type="submit"
                                      >
                                        Save
                                      </button>

                                      <button
                                        className="admin-secondary-button"
                                        type="button"
                                        onClick={() =>
                                          setEditingMemberId(
                                            null,
                                          )
                                        }
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <div
                                    className="profile-row account-profile-row"
                                    key={member.id}
                                  >
                                    <div className="profile-person">
                                      <div className="profile-avatar">
                                        {member.full_name
                                          .trim()
                                          .charAt(0)
                                          .toUpperCase() ||
                                          "?"}
                                      </div>

                                      <div className="profile-summary">
                                        <strong>
                                          {member.full_name}
                                        </strong>

                                        <span>
                                          {
                                            member.member_role
                                          }
                                          {member.email
                                            ? ` · ${member.email}`
                                            : ""}
                                          {member.phone
                                            ? ` · ${member.phone}`
                                            : ""}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="admin-row-actions">
                                      {member.member_role ===
                                        "adult" &&
                                        currentPrimary && (
                                          <button
                                            className="admin-secondary-button"
                                            type="button"
                                            onClick={() =>
                                              makePrimary(
                                                member,
                                              )
                                            }
                                          >
                                            Make primary
                                          </button>
                                        )}

                                      <button
                                        className="admin-secondary-button"
                                        type="button"
                                        onClick={() =>
                                          beginMemberEdit(
                                            member,
                                          )
                                        }
                                      >
                                        Edit
                                      </button>

                                      <button
                                        className="admin-delete-button"
                                        type="button"
                                        onClick={() =>
                                          removeMember(
                                            member,
                                          )
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
                              No people yet. The first
                              profile must be Primary.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="account-no-household">
                        This login does not have household
                        profiles.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="account-empty-state">
                    <strong>Select an account</strong>
                    <span>
                      Choose a login on the left to manage
                      it.
                    </span>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
