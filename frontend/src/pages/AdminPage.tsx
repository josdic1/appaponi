import {
  Alert,
  Badge,
  Box,
  Button,
  Field,
  Grid,
  Heading,
  HStack,
  Input,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BedDouble,
  BellRing,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  UserRoundCog,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";

import AdminWorkspace from "../components/AdminWorkspace";
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

import { AdminPageHeader } from "../components/AdminUi";

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
    <div>
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

      <AdminWorkspace
        sections={[
          {
            id: "event",
            label: "Event HQ",
            icon: CalendarDays,
            active: section === "event",
            onClick: () => setSection("event"),
          },
          {
            id: "households",
            label: "Accounts",
            icon: UsersRound,
            active: section === "households",
            onClick: () => setSection("households"),
          },
          {
            id: "staff",
            label: "Staff",
            icon: UserRoundCog,
            active: section === "staff",
            onClick: () => setSection("staff"),
          },
          {
            id: "operations",
            label: "Operations",
            icon: ClipboardList,
            active: section === "operations",
            onClick: () => setSection("operations"),
          },
          {
            id: "scheduling",
            label: "Scheduling",
            icon: CalendarRange,
            active: section === "scheduling",
            onClick: () => setSection("scheduling"),
          },
          {
            id: "registrations",
            label: "Guests + cabins",
            icon: BedDouble,
            active: section === "registrations",
            onClick: () => setSection("registrations"),
          },
          {
            id: "meals",
            label: "Meal planning",
            icon: UtensilsCrossed,
            active: section === "meals",
            onClick: () => setSection("meals"),
          },
          {
            id: "services",
            label: "Services",
            icon: BellRing,
            active: section === "services",
            onClick: () => setSection("services"),
          },
        ]}
      >
        {activeEvent &&
          ["scheduling", "registrations", "meals", "services"].includes(
            section,
          ) && (
            <Box
              display="flex"
              alignItems={{
                base: "stretch",
                md: "center",
              }}
              justifyContent="space-between"
              flexDirection={{
                base: "column",
                md: "row",
              }}
              gap="3"
              px={{ base: "4", md: "6" }}
              py="3"
              bg="gray.50"
              borderBottomWidth="1px"
              borderColor="gray.200"
            >
              <Stack gap="0">
                <Text
                  fontSize="xs"
                  color="gray.500"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Current event
                </Text>

                <Text fontWeight="700">
                  {activeEvent.name}
                </Text>
              </Stack>

              {events.length > 1 && (
                <NativeSelect.Root
                  size="sm"
                  w={{ base: "full", md: "280px" }}
                >
                  <NativeSelect.Field
                    aria-label="Current event"
                    value={activeEventId}
                    onChange={(event) =>
                      setActiveEventId(
                        event.target.value,
                      )
                    }
                  >
                    {events.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}
                  </NativeSelect.Field>

                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              )}
            </Box>
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
          <Box
            px={{ base: "4", md: "6" }}
            py="6"
            maxW="1400px"
            mx="auto"
            w="full"
          >
            <Stack gap="6">
              <Box
                display="flex"
                flexDirection={{ base: "column", md: "row" }}
                alignItems={{ base: "stretch", md: "flex-end" }}
                justifyContent="space-between"
                gap="4"
              >
                <AdminPageHeader
                  eyebrow="Admin"
                  title="Accounts & households"
                  description="Manage logins and the people inside each member household."
                />

                <Button
                  type="button"
                  colorPalette="green"
                  onClick={() =>
                    setShowCreateAccount(
                      (current) => !current,
                    )
                  }
                >
                  {showCreateAccount
                    ? "Close"
                    : "New account"}
                </Button>
              </Box>

              {error && (
                <Alert.Root status="error">
                  <Alert.Indicator />

                  <Alert.Content>
                    <Alert.Description>
                      {error}
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}

              {showCreateAccount && (
                <Box
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="xl"
                  bg="white"
                  p={{ base: "4", md: "6" }}
                >
                  <Stack gap="5">
                    <Box>
                      <Text fontWeight="700">
                        New account
                      </Text>

                      <Text
                        fontSize="sm"
                        color="gray.600"
                      >
                        Creates a login. Member profiles are added after the
                        account exists.
                      </Text>
                    </Box>

                    <Box
                      as="form"
                      onSubmit={submitAccount}
                    >
                      <SimpleGrid
                        columns={{ base: 1, md: 2 }}
                        gap="4"
                      >
                        <Field.Root>
                          <Field.Label>
                            Login username
                          </Field.Label>

                          <Input
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
                        </Field.Root>

                        {accountType === "member" && (
                          <Field.Root>
                            <Field.Label>
                              Household name
                            </Field.Label>

                            <Input
                              placeholder="Dicker Family"
                              value={displayName}
                              onChange={(event) =>
                                setDisplayName(
                                  event.target.value,
                                )
                              }
                              required
                            />
                          </Field.Root>
                        )}

                        <Field.Root>
                          <Field.Label>
                            Temporary password
                          </Field.Label>

                          <Input
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(event) =>
                              setPassword(
                                event.target.value,
                              )
                            }
                          />
                        </Field.Root>

                        <Field.Root>
                          <Field.Label>
                            Account type
                          </Field.Label>

                          <NativeSelect.Root>
                            <NativeSelect.Field
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
                              <option value="member">
                                Member
                              </option>

                              <option value="staff">
                                Staff
                              </option>

                              <option value="admin">
                                Admin
                              </option>
                            </NativeSelect.Field>

                            <NativeSelect.Indicator />
                          </NativeSelect.Root>
                        </Field.Root>
                      </SimpleGrid>

                      <HStack
                        justifyContent="flex-end"
                        mt="5"
                      >
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowCreateAccount(false);
                            setUsername("");
                            setDisplayName("");
                            setPassword("");
                          }}
                        >
                          Cancel
                        </Button>

                        <Button
                          type="submit"
                          colorPalette="green"
                        >
                          Create account
                        </Button>
                      </HStack>
                    </Box>
                  </Stack>
                </Box>
              )}

              <Grid
                templateColumns={{
                  base: "1fr",
                  lg: "320px minmax(0, 1fr)",
                }}
                gap="5"
                alignItems="start"
              >
                <Box
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="xl"
                  bg="white"
                  overflow="hidden"
                >
                  <Box
                    px="4"
                    py="3"
                    borderBottomWidth="1px"
                    borderColor="gray.200"
                  >
                    <Text fontWeight="700">
                      Accounts
                    </Text>

                    <Text
                      fontSize="sm"
                      color="gray.500"
                    >
                      {accounts.length} total
                    </Text>
                  </Box>

                  <Stack gap="0">
                    {accounts.map((item) => {
                      const selected =
                        selectedAccountId ===
                        item.id;

                      return (
                        <Button
                          key={item.id}
                          type="button"
                          variant={
                            selected
                              ? "subtle"
                              : "ghost"
                          }
                          colorPalette={
                            selected
                              ? "green"
                              : "gray"
                          }
                          h="auto"
                          borderRadius="0"
                          justifyContent="stretch"
                          px="4"
                          py="3"
                          onClick={() => {
                            setSelectedAccountId(
                              item.id,
                            );
                            setEditingAccountId(
                              null,
                            );
                            setResettingAccountId(
                              null,
                            );
                            setEditingMemberId(
                              null,
                            );
                            setShowAddProfile(
                              false,
                            );
                          }}
                        >
                          <HStack
                            w="full"
                            justifyContent="space-between"
                            gap="3"
                          >
                            <Stack
                              gap="0"
                              alignItems="flex-start"
                              minW="0"
                            >
                              <Text
                                fontWeight="700"
                                truncate
                              >
                                {item.display_name ??
                                  item.username}
                              </Text>

                              <Text
                                fontSize="xs"
                                color="gray.500"
                                fontWeight="400"
                              >
                                @{item.username}
                                {" · "}
                                {item.must_change_password
                                  ? "Password change required"
                                  : "Active"}
                              </Text>
                            </Stack>

                            <Badge
                              colorPalette={
                                item.account_type ===
                                "admin"
                                  ? "purple"
                                  : item.account_type ===
                                      "staff"
                                    ? "blue"
                                    : "green"
                              }
                            >
                              {titleCaseLabel(
                                item.account_type,
                              )}
                            </Badge>
                          </HStack>
                        </Button>
                      );
                    })}
                  </Stack>
                </Box>

                <Box
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="xl"
                  bg="white"
                  p={{ base: "4", md: "6" }}
                  minH="300px"
                >
                  {selectedAccount ? (
                    <Stack gap="6">
                      <Box
                        display="flex"
                        flexDirection={{
                          base: "column",
                          md: "row",
                        }}
                        justifyContent="space-between"
                        alignItems={{
                          base: "stretch",
                          md: "flex-start",
                        }}
                        gap="4"
                      >
                        <Stack gap="1">
                          <Text
                            fontSize="xs"
                            fontWeight="700"
                            color="gray.500"
                            letterSpacing="wide"
                          >
                            {selectedAccount.account_type ===
                            "member"
                              ? "MEMBER HOUSEHOLD"
                              : `${selectedAccount.account_type.toUpperCase()} ACCOUNT`}
                          </Text>

                          <Heading
                            as="h2"
                            size="xl"
                          >
                            {selectedAccount.display_name ??
                              selectedAccount.username}
                          </Heading>

                          <Text
                            fontSize="sm"
                            color="gray.600"
                          >
                            Login: @{selectedAccount.username}
                            {" · "}
                            {selectedAccount.must_change_password
                              ? "Temporary password — change required at next sign in."
                              : "Password active."}
                          </Text>
                        </Stack>

                        <HStack
                          flexWrap="wrap"
                          gap="2"
                        >
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              beginAccountEdit(
                                selectedAccount,
                              )
                            }
                          >
                            Edit login
                          </Button>

                          {selectedAccount.id !==
                            account?.id && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  beginPasswordReset(
                                    selectedAccount,
                                  )
                                }
                              >
                                Reset password
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                colorPalette="red"
                                onClick={() =>
                                  removeAccount(
                                    selectedAccount,
                                  )
                                }
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </HStack>
                      </Box>

                      {editingAccountId ===
                        selectedAccount.id && (
                        <Box
                          as="form"
                          onSubmit={
                            saveAccountEdit
                          }
                          borderWidth="1px"
                          borderColor="gray.200"
                          borderRadius="lg"
                          bg="gray.50"
                          p="4"
                        >
                          <Stack gap="4">
                            <Field.Root>
                              <Field.Label>
                                Login username
                              </Field.Label>

                              <Input
                                autoFocus
                                autoCapitalize="none"
                                spellCheck={false}
                                value={
                                  editingUsername
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setEditingUsername(
                                    event.target.value
                                      .toLowerCase()
                                      .replace(
                                        /\s+/g,
                                        "",
                                      )
                                      .replace(
                                        /_/g,
                                        "",
                                      ),
                                  )
                                }
                              />
                            </Field.Root>

                            {selectedAccount.account_type ===
                              "member" && (
                              <Field.Root>
                                <Field.Label>
                                  Household name
                                </Field.Label>

                                <Input
                                  value={
                                    editingDisplayName
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    setEditingDisplayName(
                                      event.target
                                        .value,
                                    )
                                  }
                                  required
                                />
                              </Field.Root>
                            )}

                            <HStack>
                              <Button
                                type="submit"
                                colorPalette="green"
                              >
                                Save
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  setEditingAccountId(
                                    null,
                                  )
                                }
                              >
                                Cancel
                              </Button>
                            </HStack>
                          </Stack>
                        </Box>
                      )}

                      {resettingAccountId ===
                        selectedAccount.id && (
                        <Box
                          as="form"
                          onSubmit={(event) =>
                            void savePasswordReset(
                              event,
                              selectedAccount.id,
                            )
                          }
                          borderWidth="1px"
                          borderColor="gray.200"
                          borderRadius="lg"
                          bg="gray.50"
                          p="4"
                        >
                          <Stack gap="4">
                            <Field.Root>
                              <Field.Label>
                                New temporary password
                              </Field.Label>

                              <Input
                                autoFocus
                                type="password"
                                autoComplete="new-password"
                                value={
                                  temporaryPassword
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setTemporaryPassword(
                                    event.target.value,
                                  )
                                }
                              />
                            </Field.Root>

                            <HStack>
                              <Button
                                type="submit"
                                colorPalette="green"
                              >
                                Reset password
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setResettingAccountId(
                                    null,
                                  );
                                  setTemporaryPassword(
                                    "",
                                  );
                                }}
                              >
                                Cancel
                              </Button>
                            </HStack>
                          </Stack>
                        </Box>
                      )}

                      {selectedAccount.account_type ===
                      "member" ? (
                        <Stack
                          gap="4"
                          pt="2"
                          borderTopWidth="1px"
                          borderColor="gray.200"
                        >
                          <HStack
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Box>
                              <Text fontWeight="700">
                                People
                              </Text>

                              <Text
                                fontSize="sm"
                                color="gray.500"
                              >
                                {selectedMembers.length}{" "}
                                {selectedMembers.length ===
                                1
                                  ? "profile"
                                  : "profiles"}
                              </Text>
                            </Box>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setShowAddProfile(
                                  (current) =>
                                    !current,
                                )
                              }
                            >
                              {showAddProfile
                                ? "Close"
                                : "Add person"}
                            </Button>
                          </HStack>

                          {showAddProfile && (
                            <Box
                              as="form"
                              onSubmit={
                                submitMember
                              }
                              borderWidth="1px"
                              borderColor="gray.200"
                              borderRadius="lg"
                              bg="gray.50"
                              p="4"
                            >
                              <SimpleGrid
                                columns={{
                                  base: 1,
                                  md: 2,
                                }}
                                gap="4"
                              >
                                <Field.Root>
                                  <Field.Label>
                                    Name
                                  </Field.Label>

                                  <Input
                                    autoFocus
                                    value={fullName}
                                    onChange={(
                                      event,
                                    ) =>
                                      setFullName(
                                        event.target
                                          .value,
                                      )
                                    }
                                  />
                                </Field.Root>

                                <Field.Root>
                                  <Field.Label>
                                    Role
                                  </Field.Label>

                                  <NativeSelect.Root>
                                    <NativeSelect.Field
                                      value={
                                        memberRole
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        setMemberRole(
                                          event.target
                                            .value as MemberRole,
                                        )
                                      }
                                    >
                                      <option value="primary">
                                        Default lead
                                      </option>

                                      <option value="adult">
                                        Adult
                                      </option>

                                      <option value="child">
                                        Child
                                      </option>
                                    </NativeSelect.Field>

                                    <NativeSelect.Indicator />
                                  </NativeSelect.Root>
                                </Field.Root>
                              </SimpleGrid>

                              <HStack
                                justifyContent="flex-end"
                                mt="4"
                              >
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setShowAddProfile(
                                      false,
                                    );
                                    setFullName("");
                                  }}
                                >
                                  Cancel
                                </Button>

                                <Button
                                  type="submit"
                                  colorPalette="green"
                                >
                                  Add person
                                </Button>
                              </HStack>
                            </Box>
                          )}

                          <Stack gap="3">
                            {selectedMembers.length ? (
                              selectedMembers.map(
                                (member) =>
                                  editingMemberId ===
                                  member.id ? (
                                    <Box
                                      as="form"
                                      key={
                                        member.id
                                      }
                                      onSubmit={
                                        saveMemberEdit
                                      }
                                      borderWidth="1px"
                                      borderColor="gray.200"
                                      borderRadius="lg"
                                      bg="gray.50"
                                      p="4"
                                    >
                                      <SimpleGrid
                                        columns={{
                                          base: 1,
                                          md: 2,
                                        }}
                                        gap="3"
                                      >
                                        <Input
                                          aria-label="Name"
                                          placeholder="Name"
                                          value={
                                            memberEdit.full_name
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            setMemberEdit(
                                              (
                                                current,
                                              ) => ({
                                                ...current,
                                                full_name:
                                                  event
                                                    .target
                                                    .value,
                                              }),
                                            )
                                          }
                                        />

                                        <Input
                                          aria-label="Email"
                                          placeholder="Email"
                                          value={
                                            memberEdit.email
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            setMemberEdit(
                                              (
                                                current,
                                              ) => ({
                                                ...current,
                                                email:
                                                  event
                                                    .target
                                                    .value,
                                              }),
                                            )
                                          }
                                        />

                                        <Input
                                          aria-label="Phone"
                                          placeholder="Phone"
                                          value={
                                            memberEdit.phone
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            setMemberEdit(
                                              (
                                                current,
                                              ) => ({
                                                ...current,
                                                phone:
                                                  event
                                                    .target
                                                    .value,
                                              }),
                                            )
                                          }
                                        />

                                        <Input
                                          aria-label="Dietary restrictions"
                                          placeholder="Dietary restrictions"
                                          value={
                                            memberEdit.dietary_restrictions
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            setMemberEdit(
                                              (
                                                current,
                                              ) => ({
                                                ...current,
                                                dietary_restrictions:
                                                  event
                                                    .target
                                                    .value,
                                              }),
                                            )
                                          }
                                        />
                                      </SimpleGrid>

                                      <HStack mt="4">
                                        <Button
                                          type="submit"
                                          colorPalette="green"
                                          size="sm"
                                        >
                                          Save
                                        </Button>

                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setEditingMemberId(
                                              null,
                                            )
                                          }
                                        >
                                          Cancel
                                        </Button>
                                      </HStack>
                                    </Box>
                                  ) : (
                                    <Box
                                      key={
                                        member.id
                                      }
                                      borderWidth="1px"
                                      borderColor="gray.200"
                                      borderRadius="lg"
                                      p="4"
                                    >
                                      <Box
                                        display="flex"
                                        flexDirection={{
                                          base: "column",
                                          md: "row",
                                        }}
                                        justifyContent="space-between"
                                        alignItems={{
                                          base: "stretch",
                                          md: "center",
                                        }}
                                        gap="4"
                                      >
                                        <HStack gap="3">
                                          <Box
                                            w="10"
                                            h="10"
                                            flexShrink="0"
                                            display="grid"
                                            placeItems="center"
                                            borderRadius="full"
                                            bg="green.50"
                                            color="green.700"
                                            fontWeight="700"
                                          >
                                            {member.full_name
                                              .trim()
                                              .charAt(
                                                0,
                                              )
                                              .toUpperCase() ||
                                              "?"}
                                          </Box>

                                          <Stack gap="0">
                                            <Text fontWeight="700">
                                              {
                                                member.full_name
                                              }
                                            </Text>

                                            <Text
                                              fontSize="sm"
                                              color="gray.500"
                                            >
                                              {titleCaseLabel(
                                                member.member_role,
                                              )}
                                              {member.email
                                                ? ` · ${member.email}`
                                                : ""}
                                              {member.phone
                                                ? ` · ${member.phone}`
                                                : ""}
                                            </Text>
                                          </Stack>
                                        </HStack>

                                        <HStack
                                          flexWrap="wrap"
                                          gap="2"
                                        >
                                          {member.member_role ===
                                            "adult" &&
                                            currentPrimary && (
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                  makePrimary(
                                                    member,
                                                  )
                                                }
                                              >
                                                Make default lead
                                              </Button>
                                            )}

                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              beginMemberEdit(
                                                member,
                                              )
                                            }
                                          >
                                            Edit
                                          </Button>

                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            colorPalette="red"
                                            onClick={() =>
                                              removeMember(
                                                member,
                                              )
                                            }
                                          >
                                            Delete
                                          </Button>
                                        </HStack>
                                      </Box>
                                    </Box>
                                  ),
                              )
                            ) : (
                              <Box
                                borderWidth="1px"
                                borderStyle="dashed"
                                borderColor="gray.300"
                                borderRadius="lg"
                                p="6"
                                textAlign="center"
                              >
                                <Text color="gray.500">
                                  No people yet. The first profile must be the default lead.
                                </Text>
                              </Box>
                            )}
                          </Stack>
                        </Stack>
                      ) : (
                        <Box
                          borderWidth="1px"
                          borderStyle="dashed"
                          borderColor="gray.300"
                          borderRadius="lg"
                          p="6"
                        >
                          <Text color="gray.500">
                            This login does not have household profiles.
                          </Text>
                        </Box>
                      )}
                    </Stack>
                  ) : (
                    <Box
                      minH="240px"
                      display="grid"
                      placeItems="center"
                      textAlign="center"
                    >
                      <Stack gap="1">
                        <Text fontWeight="700">
                          Select an account
                        </Text>

                        <Text
                          fontSize="sm"
                          color="gray.500"
                        >
                          Choose a login on the left to manage it.
                        </Text>
                      </Stack>
                    </Box>
                  )}
                </Box>
              </Grid>
            </Stack>
          </Box>
        )}
      </AdminWorkspace>
    </div>
  );
}
