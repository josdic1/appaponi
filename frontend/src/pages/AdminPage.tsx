import {
  Box,
  Button,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import AppSectionStack from "../components/AppSectionStack";
import AdminEventHqPage from "./AdminEventHqPage";
import AdminStaffPage from "./AdminStaffPage";
import AdminOperationsPage from "./AdminOperationsPage";
import AdminSchedulingPage from "./AdminSchedulingPage";
import AdminRegistrationsPage from "./AdminRegistrationsPage";
import AdminServicesPage from "./AdminServicesPage";
import AdminMealPlanningPage from "./AdminMealPlanningPage";

import type { AccountRecord } from "@appoponi/shared/schemas/accounts";

import type {
  HouseholdMember,
  MemberRole,
} from "@appoponi/shared/schemas/householdMembers";

import type { EventRecord } from "@appoponi/shared/schemas/events";

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

import { runDemoAction, type DemoAction } from "../api/dev";

import { loadEvents } from "../api/operations";

import { useAuth } from "../hooks/useAuth";

type Section =
  | "event"
  | "households"
  | "staff"
  | "operations"
  | "scheduling"
  | "registrations"
  | "meals"
  | "services";

type MemberEdit = {
  full_name: string;
  email: string;
  phone: string;
  dietary_restrictions: string;
};

function titleCaseLabel(value: string) {
  if (value === "primary") {
    return "Default lead";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AdminPage() {
  const { account, logout } = useAuth();

  const [accounts, setAccounts] = useState<AccountRecord[]>([]);

  const [members, setMembers] = useState<HouseholdMember[]>([]);

  const [selectedAccountId, setSelectedAccountId] = useState("");

  const [section, setSection] = useState<Section>("event");

  const [events, setEvents] = useState<EventRecord[]>([]);

  const [activeEventId, setActiveEventId] = useState("");

  const [mealPlanningFocus, setMealPlanningFocus] = useState<{
    requestId: number;
    mealId: string;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [showDevTools, setShowDevTools] = useState(false);

  const [demoBusy, setDemoBusy] = useState<DemoAction | null>(null);

  const [demoMessage, setDemoMessage] = useState("");

  const [username, setUsername] = useState("");

  const [displayName, setDisplayName] = useState("");

  const [password, setPassword] = useState("");

  const [accountType, setAccountType] = useState<"member" | "staff" | "admin">(
    "member",
  );

  const [fullName, setFullName] = useState("");

  const [memberRole, setMemberRole] = useState<MemberRole>("primary");

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const [editingUsername, setEditingUsername] = useState("");

  const [editingDisplayName, setEditingDisplayName] = useState("");

  const [resettingAccountId, setResettingAccountId] = useState<string | null>(
    null,
  );

  const [temporaryPassword, setTemporaryPassword] = useState("");

  const [showCreateAccount, setShowCreateAccount] = useState(false);

  const [showAddProfile, setShowAddProfile] = useState(false);

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const [memberEdit, setMemberEdit] = useState<MemberEdit>({
    full_name: "",
    email: "",
    phone: "",
    dietary_restrictions: "",
  });

  async function refresh() {
    const [nextAccounts, nextMembers] = await Promise.all([
      loadAccounts(),
      loadHouseholdMembers(),
    ]);

    setAccounts(nextAccounts);
    setMembers(nextMembers);
  }

  useEffect(() => {
    void refresh().catch((err) => {
      setError(
        err instanceof Error ? err.message : "Could not load admin data",
      );
    });
  }, []);

  useEffect(() => {
    void loadEvents()
      .then((nextEvents) => {
        setEvents(nextEvents);

        if (!activeEventId && nextEvents.length) {
          const now = Date.now();
          const preferred =
            nextEvents.find((item) => {
              const start = new Date(item.starts_at).getTime();
              const end = new Date(item.ends_at).getTime();
              return start <= now && end >= now;
            }) ??
            nextEvents.find(
              (item) => new Date(item.starts_at).getTime() > now,
            ) ??
            nextEvents.at(-1);

          setActiveEventId(preferred?.id ?? "");
        }
      })
      .catch(() => {});
  }, [activeEventId]);

  const activeEvent = useMemo(
    () => events.find((item) => item.id === activeEventId) ?? null,
    [events, activeEventId],
  );

  const selectedAccount = useMemo(
    () => accounts.find((item) => item.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  const selectedMembers = useMemo(
    () => members.filter((member) => member.account_id === selectedAccountId),
    [members, selectedAccountId],
  );

  const currentPrimary = useMemo(
    () =>
      selectedMembers.find((member) => member.member_role === "primary") ??
      null,
    [selectedMembers],
  );

  async function run(action: () => Promise<unknown>) {
    setError(null);

    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  async function submitAccount(event: FormEvent) {
    event.preventDefault();

    await run(async () => {
      const created = await createAccount({
        username,
        ...(accountType === "member"
          ? {
              display_name: displayName.trim(),
            }
          : {}),
        password,
        account_type: accountType,
      });

      setUsername("");
      setDisplayName("");
      setPassword("");
      setShowCreateAccount(false);
      setSelectedAccountId(created.id);
    });
  }

  async function submitMember(event: FormEvent) {
    event.preventDefault();

    if (!selectedAccount || selectedAccount.account_type !== "member") {
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

  function beginAccountEdit(item: AccountRecord) {
    setEditingAccountId(item.id);
    setEditingUsername(item.username);
    setEditingDisplayName(item.display_name ?? "");
  }

  function beginPasswordReset(item: AccountRecord) {
    setResettingAccountId(item.id);
    setTemporaryPassword("");
    setEditingAccountId(null);
    setError(null);
  }

  async function savePasswordReset(event: FormEvent, id: string) {
    event.preventDefault();

    if (!temporaryPassword) {
      setError("Temporary password is required.");
      return;
    }

    await run(async () => {
      await resetAccountPassword(id, temporaryPassword);

      setResettingAccountId(null);
      setTemporaryPassword("");
    });
  }

  async function saveAccountEdit(event: FormEvent) {
    event.preventDefault();

    if (!editingAccountId) {
      return;
    }

    await run(async () => {
      await updateAccount(editingAccountId, {
        username: editingUsername,
        ...(selectedAccount?.account_type === "member"
          ? {
              display_name: editingDisplayName,
            }
          : {}),
      });
      setEditingAccountId(null);
      setEditingUsername("");
      setEditingDisplayName("");
    });
  }

  function removeAccount(item: AccountRecord) {
    if (
      !window.confirm(`Delete account "${item.display_name ?? item.username}"?`)
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

  function beginMemberEdit(member: HouseholdMember) {
    setEditingMemberId(member.id);
    setMemberEdit({
      full_name: member.full_name,
      email: member.email ?? "",
      phone: member.phone ?? "",
      dietary_restrictions: member.dietary_restrictions ?? "",
    });
  }

  async function saveMemberEdit(event: FormEvent) {
    event.preventDefault();

    if (!editingMemberId) {
      return;
    }

    await run(async () => {
      await updateHouseholdMember(editingMemberId, {
        full_name: memberEdit.full_name,
        email: memberEdit.email.trim() ? memberEdit.email.trim() : null,
        phone: memberEdit.phone.trim() ? memberEdit.phone.trim() : null,
        dietary_restrictions: memberEdit.dietary_restrictions.trim()
          ? memberEdit.dietary_restrictions.trim()
          : null,
      });

      setEditingMemberId(null);
    });
  }

  function removeMember(member: HouseholdMember) {
    if (!window.confirm(`Delete ${member.full_name}?`)) {
      return;
    }

    void run(async () => {
      await deleteHouseholdMember(member.id);

      if (editingMemberId === member.id) {
        setEditingMemberId(null);
      }
    });
  }

  async function runDemo(action: DemoAction) {
    const prompts: Record<DemoAction, string> = {
      "clear-people-events":
        "CLEAR STAFF + MEMBERS + EVENTS? Admin accounts stay. Activities, areas, qualifications, activity requirements, cabins, food, menus, event categories, and meal types all stay.",
      "clear-guests-events":
        "CLEAR MEMBERS + EVENTS? Admin and staff stay. Activities, areas, qualifications, activity requirements, cabins, food, menus, event categories, and meal types all stay.",
      "seed-family-camp":
        "LOAD FAMILY CAMP 2026 DEMO? Existing staff, members, and event instances are cleared first, but your reusable setup libraries stay. The sample weekend is then loaded.",
    };

    if (!window.confirm(prompts[action])) {
      return;
    }

    setDemoBusy(action);
    setDemoMessage("");
    setError(null);

    try {
      const result = await runDemoAction(action);

      setDemoMessage(result.message);

      await refresh();

      window.setTimeout(() => window.location.reload(), 250);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo action failed");
    } finally {
      setDemoBusy(null);
    }
  }

  function makePrimary(member: HouseholdMember) {
    if (!currentPrimary) {
      setError("This household has no default lead.");
      return;
    }

    if (!window.confirm(`Make ${member.full_name} the default household lead?`)) {
      return;
    }

    void run(() => transferHouseholdPrimary(currentPrimary.id, member.id));
  }

  return (
    <div className="admin-page has-section-rail">
      <Box
        as="header"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap="4"
        px={{ base: "4", md: "6" }}
        py="3"
        bg="white"
        borderBottomWidth="1px"
        borderColor="gray.200"
      >
        <Button
          type="button"
          variant="ghost"
          h="auto"
          p="1"
          aria-label="Appaponi home"
          onClick={() => {
            setSection("event");
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
        >
          <HStack gap="3">
            <Box
              w="9"
              h="9"
              display="grid"
              placeItems="center"
              borderRadius="md"
              bg="green.700"
              color="white"
              fontWeight="700"
            >
              A
            </Box>

            <Stack
              gap="0"
              alignItems="flex-start"
            >
              <Text fontWeight="700">
                Appaponi
              </Text>

              <Text
                fontSize="xs"
                color="gray.500"
              >
                Admin
              </Text>
            </Stack>
          </HStack>
        </Button>

        <HStack gap="3">
          <Box position="relative">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setShowDevTools(
                  (current) => !current,
                )
              }
            >
              DEV
            </Button>

            {showDevTools && (
              <Box
                position="absolute"
                top="calc(100% + 8px)"
                right="0"
                zIndex="dropdown"
                w="320px"
                maxW="calc(100vw - 32px)"
                bg="white"
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="lg"
                boxShadow="lg"
                p="3"
              >
                <Stack gap="3">
                  <Box>
                    <Text fontWeight="700">
                      Demo data
                    </Text>

                    <Text
                      fontSize="sm"
                      color="gray.500"
                    >
                      {demoBusy
                        ? "Working…"
                        : demoMessage || "Ready"}
                    </Text>
                  </Box>

                  <Button
                    type="button"
                    variant="outline"
                    colorPalette="red"
                    h="auto"
                    py="3"
                    justifyContent="flex-start"
                    disabled={demoBusy !== null}
                    onClick={() =>
                      void runDemo(
                        "clear-people-events",
                      )
                    }
                  >
                    <Stack
                      gap="0"
                      alignItems="flex-start"
                    >
                      <Text fontWeight="700">
                        Clear people + events
                      </Text>

                      <Text
                        fontSize="xs"
                        fontWeight="400"
                      >
                        Keep admin + reusable setup
                      </Text>
                    </Stack>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    h="auto"
                    py="3"
                    justifyContent="flex-start"
                    disabled={demoBusy !== null}
                    onClick={() =>
                      void runDemo(
                        "clear-guests-events",
                      )
                    }
                  >
                    <Stack
                      gap="0"
                      alignItems="flex-start"
                    >
                      <Text fontWeight="700">
                        Clear guests + events
                      </Text>

                      <Text
                        fontSize="xs"
                        fontWeight="400"
                      >
                        Keep admin + staff + reusable setup
                      </Text>
                    </Stack>
                  </Button>

                  <Button
                    type="button"
                    colorPalette="green"
                    h="auto"
                    py="3"
                    justifyContent="flex-start"
                    disabled={demoBusy !== null}
                    onClick={() =>
                      void runDemo(
                        "seed-family-camp",
                      )
                    }
                  >
                    <Stack
                      gap="0"
                      alignItems="flex-start"
                    >
                      <Text fontWeight="700">
                        Family Camp demo
                      </Text>

                      <Text
                        fontSize="xs"
                        fontWeight="400"
                      >
                        Keep setup; load Aug 19–22 sample
                      </Text>
                    </Stack>
                  </Button>
                </Stack>
              </Box>
            )}
          </Box>

          <Text
            display={{ base: "none", md: "block" }}
            fontSize="sm"
            color="gray.600"
          >
            @{account?.username}
          </Text>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void logout()}
          >
            Sign out
          </Button>
        </HStack>
      </Box>

      <AppSectionStack
        label="Admin sections"
        items={[
            {
              id: "event",
              label: "Event HQ",
              active: section === "event",
              onClick: () => setSection("event"),
            },
            {
              id: "households",
              label: "Accounts",
              active: section === "households",
              onClick: () => setSection("households"),
            },
            {
              id: "staff",
              label: "Staff",
              active: section === "staff",
              onClick: () => setSection("staff"),
            },
            {
              id: "operations",
              label: "Operations",
              active: section === "operations",
              onClick: () => setSection("operations"),
            },
            {
              id: "scheduling",
              label: "Scheduling",
              active: section === "scheduling",
              onClick: () => setSection("scheduling"),
            },
            {
              id: "registrations",
              label: "Guests + cabins",
              active: section === "registrations",
              onClick: () => setSection("registrations"),
            },
            {
              id: "meals",
              label: "Meal planning",
              active: section === "meals",
              onClick: () => setSection("meals"),
            },
            {
              id: "services",
              label: "Services",
              active: section === "services",
              onClick: () => setSection("services"),
            },
        ]}
      />

      <main className="admin-main">
        {activeEvent &&
          ["scheduling", "registrations", "meals", "services"].includes(
            section,
          ) && (
            <div className="admin-event-context">
              <div>
                <span>Current event</span>
                <strong>{activeEvent.name}</strong>
              </div>
              {events.length > 1 && (
                <select
                  aria-label="Current event"
                  value={activeEventId}
                  onChange={(event) => setActiveEventId(event.target.value)}
                >
                  {events.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

        {section === "event" ? (
          <AdminEventHqPage
            activeEventId={activeEventId}
            onActiveEventChange={setActiveEventId}
            onNavigate={(destination, options) => {
              const mealId = options?.mealId;

              if (destination === "meals" && mealId) {
                setMealPlanningFocus((current) => ({
                  requestId: (current?.requestId ?? 0) + 1,
                  mealId,
                }));
              }

              setSection(destination);
            }}
          />
        ) : section === "staff" ? (
          <AdminStaffPage />
        ) : section === "operations" ? (
          <AdminOperationsPage />
        ) : section === "scheduling" ? (
          <AdminSchedulingPage activeEventId={activeEventId} />
        ) : section === "registrations" ? (
          <AdminRegistrationsPage activeEventId={activeEventId} />
        ) : section === "meals" ? (
          <AdminMealPlanningPage
            activeEventId={activeEventId}
            focusRequest={mealPlanningFocus}
          />
        ) : section === "services" ? (
          <AdminServicesPage activeEventId={activeEventId} />
        ) : (
          <>
            <div className="admin-heading accounts-heading">
              <div>
                <div className="admin-eyebrow">ADMIN</div>

                <h1>Accounts & households</h1>

                <p>
                  Manage logins and the people inside each member household.
                </p>
              </div>

              <button
                className="app-button app-button-primary"
                type="button"
                onClick={() => setShowCreateAccount((current) => !current)}
              >
                {showCreateAccount ? "Close" : "New account"}
              </button>
            </div>

            {error && <div className="app-alert app-alert-danger">{error}</div>}

            {showCreateAccount && (
              <section className="app-card account-create-drawer">
                <div className="account-create-head">
                  <div>
                    <strong>New account</strong>
                    <span>
                      Creates a login. Member profiles are added after the
                      account exists.
                    </span>
                  </div>
                </div>

                <form className="account-create-grid" onSubmit={submitAccount}>
                  <label>
                    <span>Login username</span>
                    <input
                      autoFocus
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="dicker"
                      value={username}
                      onChange={(event) =>
                        setUsername(
                          event.target.value
                            .toLowerCase()
                            .replace(/\s+/g, "")
                            .replace(/_/g, ""),
                        )
                      }
                    />
                  </label>

                  {accountType === "member" && (
                    <label>
                      <span>Household name</span>

                      <input
                        placeholder="Dicker Family"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        required
                      />
                    </label>
                  )}

                  <label>
                    <span>Temporary password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Account type</span>
                    <select
                      value={accountType}
                      onChange={(event) =>
                        setAccountType(
                          event.target.value as "member" | "staff" | "admin",
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
                      className="app-button"
                      type="button"
                      onClick={() => {
                        setShowCreateAccount(false);
                        setUsername("");
                        setDisplayName("");
                        setPassword("");
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      className="app-button app-button-primary"
                      type="submit"
                    >
                      Create account
                    </button>
                  </div>
                </form>
              </section>
            )}

            <div className="account-workspace">
              <section className="app-card account-directory">
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
                        selectedAccountId === item.id ? "active" : ""
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
                        <strong>{item.display_name ?? item.username}</strong>
                        <small>
                          @{item.username}
                          {" · "}
                          {item.must_change_password
                            ? "Password change required"
                            : "Active"}
                        </small>
                      </span>

                      <span
                        className={`account-type-pill ${item.account_type}`}
                      >
                        {titleCaseLabel(item.account_type)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="app-card account-detail">
                {selectedAccount ? (
                  <>
                    <div className="account-detail-head">
                      <div className="account-detail-title">
                        <span>
                          {selectedAccount.account_type === "member"
                            ? "MEMBER HOUSEHOLD"
                            : `${selectedAccount.account_type.toUpperCase()} ACCOUNT`}
                        </span>

                        <h2>
                          {selectedAccount.display_name ??
                            selectedAccount.username}
                        </h2>

                        <p>
                          Login: @{selectedAccount.username}
                          {" · "}
                          {selectedAccount.must_change_password
                            ? "Temporary password — change required at next sign in."
                            : "Password active."}
                        </p>
                      </div>

                      <div className="account-detail-actions">
                        <button
                          className="app-button"
                          type="button"
                          onClick={() => beginAccountEdit(selectedAccount)}
                        >
                          Edit login
                        </button>

                        {selectedAccount.id !== account?.id && (
                          <>
                            <button
                              className="app-button"
                              type="button"
                              onClick={() =>
                                beginPasswordReset(selectedAccount)
                              }
                            >
                              Reset password
                            </button>

                            <button
                              className="app-button app-button-danger"
                              type="button"
                              onClick={() => removeAccount(selectedAccount)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {editingAccountId === selectedAccount.id && (
                      <form
                        className="account-detail-tool"
                        onSubmit={saveAccountEdit}
                      >
                        <label>
                          <span>Login username</span>

                          <input
                            autoFocus
                            autoCapitalize="none"
                            spellCheck={false}
                            value={editingUsername}
                            onChange={(event) =>
                              setEditingUsername(
                                event.target.value
                                  .toLowerCase()
                                  .replace(/\s+/g, "")
                                  .replace(/_/g, ""),
                              )
                            }
                          />
                        </label>

                        {selectedAccount.account_type === "member" && (
                          <label>
                            <span>Household name</span>

                            <input
                              value={editingDisplayName}
                              onChange={(event) =>
                                setEditingDisplayName(event.target.value)
                              }
                              required
                            />
                          </label>
                        )}

                        <div className="admin-row-actions">
                          <button
                            className="app-button app-button-primary"
                            type="submit"
                          >
                            Save
                          </button>

                          <button
                            className="app-button"
                            type="button"
                            onClick={() => setEditingAccountId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}

                    {resettingAccountId === selectedAccount.id && (
                      <form
                        className="account-detail-tool"
                        onSubmit={(event) =>
                          void savePasswordReset(event, selectedAccount.id)
                        }
                      >
                        <label>
                          <span>New temporary password</span>

                          <input
                            autoFocus
                            type="password"
                            autoComplete="new-password"
                            value={temporaryPassword}
                            onChange={(event) =>
                              setTemporaryPassword(event.target.value)
                            }
                          />
                        </label>

                        <div className="admin-row-actions">
                          <button
                            className="app-button app-button-primary"
                            type="submit"
                          >
                            Reset password
                          </button>

                          <button
                            className="app-button"
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

                    {selectedAccount.account_type === "member" ? (
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
                            className="app-button"
                            type="button"
                            onClick={() =>
                              setShowAddProfile((current) => !current)
                            }
                          >
                            {showAddProfile ? "Close" : "Add person"}
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
                                  setFullName(event.target.value)
                                }
                              />
                            </label>

                            <label>
                              <span>Role</span>

                              <select
                                value={memberRole}
                                onChange={(event) =>
                                  setMemberRole(
                                    event.target.value as MemberRole,
                                  )
                                }
                              >
                                <option value="primary">Default lead</option>
                                <option value="adult">Adult</option>
                                <option value="child">Child</option>
                              </select>
                            </label>

                            <div className="profile-add-actions">
                              <button
                                className="app-button"
                                type="button"
                                onClick={() => {
                                  setShowAddProfile(false);
                                  setFullName("");
                                }}
                              >
                                Cancel
                              </button>

                              <button
                                className="app-button app-button-primary"
                                type="submit"
                              >
                                Add person
                              </button>
                            </div>
                          </form>
                        )}

                        <div className="profile-list account-profile-list">
                          {selectedMembers.length ? (
                            selectedMembers.map((member) =>
                              editingMemberId === member.id ? (
                                <form
                                  className="profile-row profile-edit-row account-profile-edit"
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
                                      className="app-button app-button-primary"
                                      type="submit"
                                    >
                                      Save
                                    </button>

                                    <button
                                      className="app-button"
                                      type="button"
                                      onClick={() => setEditingMemberId(null)}
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
                                        .toUpperCase() || "?"}
                                    </div>

                                    <div className="profile-summary">
                                      <strong>{member.full_name}</strong>

                                      <span>
                                        {titleCaseLabel(member.member_role)}
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
                                    {member.member_role === "adult" &&
                                      currentPrimary && (
                                        <button
                                          className="app-button"
                                          type="button"
                                          onClick={() => makePrimary(member)}
                                        >
                                          Make default lead
                                        </button>
                                      )}

                                    <button
                                      className="app-button"
                                      type="button"
                                      onClick={() => beginMemberEdit(member)}
                                    >
                                      Edit
                                    </button>

                                    <button
                                      className="app-button app-button-danger"
                                      type="button"
                                      onClick={() => removeMember(member)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ),
                            )
                          ) : (
                            <div className="app-empty">
                              No people yet. The first profile must be the default lead.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="account-no-household">
                        This login does not have household profiles.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="app-empty-state">
                    <strong>Select an account</strong>
                    <span>Choose a login on the left to manage it.</span>
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
