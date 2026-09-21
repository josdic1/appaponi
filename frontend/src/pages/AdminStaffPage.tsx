import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Field,
  Grid,
  HStack,
  Input,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  UserPlus,
  UsersRound,
} from "lucide-react";

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

import { AdminPageHeader } from "../components/AdminUi";
import PageSectionLayout from "../components/PageSectionLayout";

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

  const pageSections = useMemo(
    () => [
      ...(availableAccounts.length
        ? [
            {
              id: "staff-create",
              label: "Add staff",
              icon: UserPlus,
              targetId: "staff-create",
            },
          ]
        : []),
      {
        id: "staff-list",
        label: "Staff",
        icon: UsersRound,
        targetId: "staff-list",
      },
    ],
    [availableAccounts.length],
  );

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
    <Box
      as="section"
      w="full"
    >
      <Stack gap="6">
        <AdminPageHeader
          eyebrow="Admin"
          title="Staff"
          description="Staff profiles connect login accounts to camp staffing and scheduling."
        />

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

        <PageSectionLayout
          items={pageSections}
          label="Staff page sections"
        >
        <Grid
          templateColumns={
            availableAccounts.length
              ? {
                  base: "1fr",
                  lg: "360px minmax(0, 1fr)",
                }
              : "1fr"
          }
          gap="5"
          alignItems="start"
        >
          {availableAccounts.length > 0 && (
            <Box
              id="staff-create"
              scrollMarginTop="96px"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="xl"
              bg="white"
              p={{ base: "4", md: "5" }}
            >
              <Stack gap="5">
                <Box>
                  <Text fontWeight="700">
                    Create staff profile
                  </Text>

                  <Text
                    fontSize="sm"
                    color="gray.500"
                  >
                    Attach an existing staff login.
                  </Text>
                </Box>

                <Box
                  as="form"
                  onSubmit={submit}
                >
                  <Stack gap="4">
                    <Field.Root>
                      <Field.Label>
                        Account
                      </Field.Label>

                      <NativeSelect.Root>
                        <NativeSelect.Field
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

                          {availableAccounts.map(
                            (item) => (
                              <option
                                key={item.id}
                                value={item.id}
                              >
                                {item.display_name ??
                                  item.username}
                              </option>
                            ),
                          )}
                        </NativeSelect.Field>

                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>
                        Name
                      </Field.Label>

                      <Input
                        value={fullName}
                        onChange={(event) =>
                          setFullName(
                            event.target.value,
                          )
                        }
                      />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>
                        Email
                      </Field.Label>

                      <Input
                        type="email"
                        value={email}
                        onChange={(event) =>
                          setEmail(
                            event.target.value,
                          )
                        }
                      />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>
                        Phone
                      </Field.Label>

                      <Input
                        value={phone}
                        onChange={(event) =>
                          setPhone(
                            event.target.value,
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
                          value={role}
                          onChange={(event) =>
                            setRole(
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
                        </NativeSelect.Field>

                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>

                    <Checkbox.Root
                      checked={
                        babysittingEligible
                      }
                      onCheckedChange={(
                        details,
                      ) =>
                        setBabysittingEligible(
                          details.checked === true,
                        )
                      }
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>

                      <Checkbox.Label>
                        Available for babysitting
                      </Checkbox.Label>
                    </Checkbox.Root>

                    <Button
                      type="submit"
                      colorPalette="green"
                    >
                      Create staff profile
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          )}

          <Box
            id="staff-list"
            scrollMarginTop="96px"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="xl"
            bg="white"
            overflow="hidden"
          >
            <Box
              px="5"
              py="4"
              borderBottomWidth="1px"
              borderColor="gray.200"
            >
              <Text fontWeight="700">
                Staff
              </Text>

              <Text
                fontSize="sm"
                color="gray.500"
              >
                {staff.length} total
              </Text>
            </Box>

            {staff.length ? (
              <Stack gap="0">
                {staff.map((item) =>
                  editingId === item.id ? (
                    <Box
                      as="form"
                      key={item.id}
                      onSubmit={(event) =>
                        void saveEdit(
                          event,
                          item.id,
                        )
                      }
                      px="5"
                      py="4"
                      bg="gray.50"
                      borderBottomWidth="1px"
                      borderColor="gray.200"
                    >
                      <Stack gap="4">
                        <SimpleGrid
                          columns={{
                            base: 1,
                            md: 2,
                          }}
                          gap="3"
                        >
                          <Input
                            aria-label="Staff name"
                            placeholder="Name"
                            value={editFullName}
                            onChange={(event) =>
                              setEditFullName(
                                event.target.value,
                              )
                            }
                          />

                          <Input
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

                          <Input
                            aria-label="Staff phone"
                            placeholder="Phone"
                            value={editPhone}
                            onChange={(event) =>
                              setEditPhone(
                                event.target.value,
                              )
                            }
                          />

                          <NativeSelect.Root>
                            <NativeSelect.Field
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
                            </NativeSelect.Field>

                            <NativeSelect.Indicator />
                          </NativeSelect.Root>
                        </SimpleGrid>

                        <Checkbox.Root
                          checked={
                            editBabysittingEligible
                          }
                          onCheckedChange={(
                            details,
                          ) =>
                            setEditBabysittingEligible(
                              details.checked ===
                                true,
                            )
                          }
                        >
                          <Checkbox.HiddenInput />

                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>

                          <Checkbox.Label>
                            Babysitting
                          </Checkbox.Label>
                        </Checkbox.Root>

                        <HStack>
                          <Button
                            type="submit"
                            size="sm"
                            colorPalette="green"
                          >
                            Save
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                        </HStack>
                      </Stack>
                    </Box>
                  ) : (
                    <Box
                      key={item.id}
                      px="5"
                      py="4"
                      borderBottomWidth="1px"
                      borderColor="gray.100"
                    >
                      <Box
                        display="flex"
                        flexDirection={{
                          base: "column",
                          xl: "row",
                        }}
                        alignItems={{
                          base: "stretch",
                          xl: "center",
                        }}
                        justifyContent="space-between"
                        gap="4"
                      >
                        <HStack gap="3">
                          <Box
                            w="11"
                            h="11"
                            flexShrink="0"
                            display="grid"
                            placeItems="center"
                            borderRadius="full"
                            bg="green.50"
                            color="green.700"
                            fontWeight="700"
                          >
                            {initials(
                              item.full_name,
                            )}
                          </Box>

                          <Stack gap="0">
                            <Text fontWeight="700">
                              {item.full_name}
                            </Text>

                            <Text
                              fontSize="sm"
                              color="gray.500"
                            >
                              {item.username
                                ? `@${item.username}`
                                : "No login account"}
                            </Text>
                          </Stack>
                        </HStack>

                        <HStack
                          flexWrap="wrap"
                          gap="2"
                        >
                          <Badge
                            colorPalette={
                              item.role ===
                              "manager"
                                ? "purple"
                                : "blue"
                            }
                          >
                            {item.role ===
                            "manager"
                              ? "Manager"
                              : "Staff"}
                          </Badge>

                          {item.babysitting_eligible && (
                            <Badge colorPalette="green">
                              Babysitting
                            </Badge>
                          )}

                          {qualificationsFor(
                            item.id,
                          ).map(
                            (
                              qualification,
                            ) => (
                              <Badge
                                key={
                                  qualification
                                }
                                colorPalette="gray"
                              >
                                {
                                  qualification
                                }
                              </Badge>
                            ),
                          )}
                        </HStack>

                        <Stack
                          gap="0"
                          minW={{
                            xl: "180px",
                          }}
                        >
                          {item.email && (
                            <Text
                              fontSize="sm"
                              color="gray.600"
                            >
                              {item.email}
                            </Text>
                          )}

                          {item.phone && (
                            <Text
                              fontSize="sm"
                              color="gray.600"
                            >
                              {item.phone}
                            </Text>
                          )}
                        </Stack>

                        <HStack>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              beginEdit(item)
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
                              void remove(item)
                            }
                          >
                            Delete
                          </Button>
                        </HStack>
                      </Box>
                    </Box>
                  ),
                )}
              </Stack>
            ) : (
              <Box
                p="8"
                textAlign="center"
              >
                <Text color="gray.500">
                  No staff profiles yet.
                </Text>
              </Box>
            )}
          </Box>
        </Grid>
        </PageSectionLayout>
      </Stack>
    </Box>
  );
}
