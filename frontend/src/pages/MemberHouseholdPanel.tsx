import {
  useEffect,
  useState,
} from "react";

import {
  Box,
  Button,
  Grid,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
} from "@chakra-ui/react";

import type {
  HouseholdMember,
  MemberRole,
} from "@appoponi/shared/schemas/householdMembers";

import {
  addOwnHouseholdMember,
  deleteOwnHouseholdMember,
  makeOwnHouseholdPrimary,
  updateOwnHousehold,
  updateOwnHouseholdMember,
} from "../api/member";

type Props = {
  household: HouseholdMember[];
  disabled: boolean;
  onChanged: () => Promise<void>;
};

type PersonDraft = {
  full_name: string;
  email: string;
  phone: string;
  dietary_restrictions: string;
  member_role: "adult" | "child";
};

const emptyDraft: PersonDraft = {
  full_name: "",
  email: "",
  phone: "",
  dietary_restrictions: "",
  member_role: "adult",
};

function roleLabel(
  role: MemberRole,
) {
  if (role === "primary") {
    return "Default lead";
  }

  return (
    role.charAt(0).toUpperCase() +
    role.slice(1)
  );
}

export default function MemberHouseholdPanel({
  household,
  disabled,
  onChanged,
}: Props) {
  const householdName =
    household[0]?.household_name ??
    "";

  const [
    editingHouseholdName,
    setEditingHouseholdName,
  ] = useState(false);

  const [
    householdNameDraft,
    setHouseholdNameDraft,
  ] = useState(householdName);

  const [adding, setAdding] =
    useState(false);

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(
    null,
  );

  const [draft, setDraft] =
    useState<PersonDraft>(
      emptyDraft,
    );

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    setHouseholdNameDraft(
      householdName,
    );
  }, [householdName]);

  function beginAdd() {
    setDraft(emptyDraft);
    setEditingId(null);
    setAdding(true);
    setError(null);
  }

  function beginEdit(
    person: HouseholdMember,
  ) {
    setDraft({
      full_name:
        person.full_name,
      email:
        person.email ?? "",
      phone:
        person.phone ?? "",
      dietary_restrictions:
        person
          .dietary_restrictions ??
        "",
      member_role:
        person.member_role ===
        "child"
          ? "child"
          : "adult",
    });

    setAdding(false);
    setEditingId(person.id);
    setError(null);
  }

  function closePersonForm() {
    setAdding(false);
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
  }

  async function saveHouseholdName() {
    setBusy(true);
    setError(null);

    try {
      await updateOwnHousehold({
        household_name:
          householdNameDraft,
      });

      await onChanged();
      setEditingHouseholdName(
        false,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update household",
      );
    } finally {
      setBusy(false);
    }
  }

  async function savePerson() {
    setBusy(true);
    setError(null);

    try {
      if (editingId) {
        await updateOwnHouseholdMember(
          editingId,
          {
            full_name:
              draft.full_name,
            email:
              draft.email.trim() ||
              null,
            phone:
              draft.phone.trim() ||
              null,
            dietary_restrictions:
              draft
                .dietary_restrictions
                .trim() ||
              null,
          },
        );
      } else {
        await addOwnHouseholdMember({
          full_name:
            draft.full_name,
          member_role:
            draft.member_role,
          ...(draft.email.trim()
            ? {
                email:
                  draft.email.trim(),
              }
            : {}),
          ...(draft.phone.trim()
            ? {
                phone:
                  draft.phone.trim(),
              }
            : {}),
          ...(draft
            .dietary_restrictions
            .trim()
            ? {
                dietary_restrictions:
                  draft
                    .dietary_restrictions
                    .trim(),
              }
            : {}),
        });
      }

      await onChanged();
      closePersonForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save person",
      );
    } finally {
      setBusy(false);
    }
  }

  async function makePrimary(
    person: HouseholdMember,
  ) {
    if (
      !window.confirm(
        `Make ${person.full_name} the default household lead? The current default lead will remain an Adult.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await makeOwnHouseholdPrimary(
        person.id,
      );

      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not change default household lead",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removePerson(
    person: HouseholdMember,
  ) {
    if (
      !window.confirm(
        `Remove ${person.full_name} from this household?`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await deleteOwnHouseholdMember(
        person.id,
      );

      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not remove person",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      as="section"
      mb="16px"
      overflow="hidden"
      borderWidth="1px"
      borderColor="#dddcd5"
      borderRadius="12px"
      bg="#ffffff"
    >
      <Box
        minH="58px"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap="12px"
        px="16px"
        py="13px"
        borderBottomWidth="1px"
        borderColor="#dddcd5"
      >
        <Stack minW="0" gap="3px">
          <Text as="strong">
            Your household
          </Text>

          <Text
            as="span"
            color="#6d7169"
            fontSize="11px"
          >
            {household.length}{" "}
            {household.length === 1
              ? "person"
              : "people"}
          </Text>
        </Stack>

        <Button
          type="button"
          disabled={disabled || busy}
          minH="34px"
          borderWidth="1px"
          borderColor="#dddcd5"
          borderRadius="8px"
          bg="#ffffff"
          px="11px"
          fontSize="12px"
          fontWeight="650"
          _hover={{
            borderColor: "#c8c7bf",
            bg: "#fbfaf7",
          }}
          onClick={beginAdd}
        >
          Add person
        </Button>
      </Box>

      <Box
        minH="60px"
        display="flex"
        alignItems="center"
        gap="10px"
        px="16px"
        py="10px"
        borderBottomWidth="1px"
        borderColor="#dddcd5"
        bg="#fbfaf7"
      >
        {editingHouseholdName ? (
          <>
            <Input
              value={householdNameDraft}
              flex="1"
              minH="40px"
              borderColor="#c8c7bf"
              borderRadius="8px"
              bg="#ffffff"
              px="11px"
              _focus={{
                borderColor: "#007854",
                boxShadow: "0 0 0 3px #e7f3ef",
              }}
              onChange={(event) =>
                setHouseholdNameDraft(
                  event.target.value,
                )
              }
            />

            <Button
              type="button"
              disabled={
                busy ||
                !householdNameDraft.trim()
              }
              minH="34px"
              borderWidth="1px"
              borderColor="#dddcd5"
              borderRadius="8px"
              bg="#ffffff"
              px="11px"
              fontSize="12px"
              fontWeight="650"
              onClick={() =>
                void saveHouseholdName()
              }
            >
              Save
            </Button>

            <Button
              type="button"
              disabled={busy}
              minH="34px"
              borderWidth="1px"
              borderColor="#dddcd5"
              borderRadius="8px"
              bg="#ffffff"
              px="11px"
              fontSize="12px"
              fontWeight="650"
              onClick={() => {
                setHouseholdNameDraft(
                  householdName,
                );
                setEditingHouseholdName(false);
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Stack
              minW="0"
              flex="1"
              gap="3px"
            >
              <Text
                as="small"
                color="#6d7169"
                fontSize="10px"
                fontWeight="700"
                letterSpacing="0.05em"
                textTransform="uppercase"
              >
                Household name
              </Text>

              <Text as="strong">
                {householdName}
              </Text>
            </Stack>

            <Button
              type="button"
              disabled={disabled || busy}
              minH="34px"
              borderWidth="1px"
              borderColor="#dddcd5"
              borderRadius="8px"
              bg="#ffffff"
              px="11px"
              fontSize="12px"
              fontWeight="650"
              onClick={() =>
                setEditingHouseholdName(true)
              }
            >
              Edit
            </Button>
          </>
        )}
      </Box>

      <Stack gap="0">
        {household.map((person) => (
          <Box
            key={person.id}
            minH="72px"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            gap="16px"
            px="16px"
            py="11px"
            borderBottomWidth="1px"
            borderColor="#dddcd5"
            css={{
              "&:last-child": {
                borderBottomWidth: "0",
              },
              "@media (max-width: 620px)": {
                alignItems: "flex-start",
                flexDirection: "column",
              },
            }}
          >
            <HStack
              minW="0"
              flex="1"
              gap="11px"
            >
              <Box
                w="34px"
                h="34px"
                flex="0 0 auto"
                display="grid"
                placeItems="center"
                borderRadius="999px"
                bg="#e7f3ef"
                color="#005d41"
                fontSize="11px"
                fontWeight="800"
              >
                {person.full_name
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </Box>

              <Stack
                minW="0"
                gap="4px"
              >
                <HStack
                  gap="7px"
                  flexWrap="wrap"
                >
                  <Text as="strong">
                    {person.full_name}
                  </Text>

                  <Box
                    as="span"
                    display="inline-flex"
                    alignItems="center"
                    w="fit-content"
                    minH="22px"
                    px="7px"
                    borderWidth="1px"
                    borderColor={
                      person.member_role === "primary"
                        ? "#b7ddcf"
                        : "#dddcd5"
                    }
                    borderRadius="999px"
                    bg={
                      person.member_role === "primary"
                        ? "#e7f3ef"
                        : "#fbfaf7"
                    }
                    color={
                      person.member_role === "primary"
                        ? "#005d41"
                        : "#6d7169"
                    }
                    fontSize="9px"
                    fontWeight="800"
                    letterSpacing="0.03em"
                    textTransform="capitalize"
                  >
                    {roleLabel(
                      person.member_role,
                    )}
                  </Box>
                </HStack>

                <Text
                  as="small"
                  color="#6d7169"
                  fontSize="11px"
                >
                  {[
                    person.email,
                    person.phone,
                    person.dietary_restrictions,
                  ]
                    .filter(Boolean)
                    .join(" · ") ||
                    "No additional details"}
                </Text>
              </Stack>
            </HStack>

            <HStack
              flex="0 0 auto"
              gap="7px"
              flexWrap="wrap"
              css={{
                "@media (max-width: 620px)": {
                  width: "100%",
                  "& > button": {
                    flex: "1 1 auto",
                  },
                },
              }}
            >
              <Button
                type="button"
                disabled={disabled || busy}
                minH="34px"
                borderWidth="1px"
                borderColor="#dddcd5"
                borderRadius="8px"
                bg="#ffffff"
                px="11px"
                fontSize="12px"
                fontWeight="650"
                onClick={() =>
                  beginEdit(person)
                }
              >
                Edit
              </Button>

              {person.member_role ===
                "adult" && (
                <Button
                  type="button"
                  disabled={disabled || busy}
                  minH="34px"
                  borderWidth="1px"
                  borderColor="#b7ddcf"
                  borderRadius="8px"
                  bg="#ffffff"
                  px="11px"
                  color="#005d41"
                  fontSize="12px"
                  fontWeight="650"
                  onClick={() =>
                    void makePrimary(person)
                  }
                >
                  Make default lead
                </Button>
              )}

              {person.member_role !==
                "primary" && (
                <Button
                  type="button"
                  disabled={disabled || busy}
                  minH="34px"
                  borderWidth="1px"
                  borderColor="#dddcd5"
                  borderRadius="8px"
                  bg="#ffffff"
                  px="11px"
                  color="#b63a33"
                  fontSize="12px"
                  fontWeight="650"
                  _hover={{
                    borderColor: "#b63a33",
                    bg: "#fff0ef",
                  }}
                  onClick={() =>
                    void removePerson(person)
                  }
                >
                  Remove
                </Button>
              )}
            </HStack>
          </Box>
        ))}
      </Stack>

      {(adding || editingId) && (
        <Box
          maxW="720px"
          m="14px 16px 16px"
          p="16px"
          borderWidth="1px"
          borderColor="#dddcd5"
          borderRadius="10px"
          bg="#fbfaf7"
          css={{
            "@media (max-width: 620px)": {
              margin: "10px",
              padding: "14px",
            },
          }}
        >
          <Box mb="14px">
            <Stack gap="3px">
              <Text as="strong">
                {editingId
                  ? "Edit person"
                  : "Add person"}
              </Text>

              <Text
                as="span"
                color="#6d7169"
                fontSize="11px"
              >
                {editingId
                  ? "Update this household profile."
                  : "Add an Adult or Child to your household."}
              </Text>
            </Stack>
          </Box>

          <Grid
            templateColumns="repeat(2, minmax(0, 1fr))"
            gap="12px"
            css={{
              "@media (max-width: 620px)": {
                gridTemplateColumns: "1fr",
              },
            }}
          >
            <Stack as="label" gap="6px">
              <Text
                as="span"
                color="#6d7169"
                fontSize="11px"
                fontWeight="700"
              >
                Full name
              </Text>

              <Input
                autoFocus
                value={draft.full_name}
                minH="40px"
                borderColor="#c8c7bf"
                borderRadius="8px"
                bg="#ffffff"
                px="11px"
                _focus={{
                  borderColor: "#007854",
                  boxShadow:
                    "0 0 0 3px #e7f3ef",
                }}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    full_name:
                      event.target.value,
                  }))
                }
              />
            </Stack>

            {!editingId && (
              <Stack as="label" gap="6px">
                <Text
                  as="span"
                  color="#6d7169"
                  fontSize="11px"
                  fontWeight="700"
                >
                  Role
                </Text>

                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={draft.member_role}
                    minH="40px"
                    borderColor="#c8c7bf"
                    borderRadius="8px"
                    bg="#ffffff"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        member_role:
                          event.target
                            .value as
                            | "adult"
                            | "child",
                      }))
                    }
                  >
                    <option value="adult">
                      Adult
                    </option>

                    <option value="child">
                      Child
                    </option>
                  </NativeSelect.Field>

                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Stack>
            )}

            <Stack as="label" gap="6px">
              <Text
                as="span"
                color="#6d7169"
                fontSize="11px"
                fontWeight="700"
              >
                Email
              </Text>

              <Input
                type="email"
                value={draft.email}
                minH="40px"
                borderColor="#c8c7bf"
                borderRadius="8px"
                bg="#ffffff"
                px="11px"
                _focus={{
                  borderColor: "#007854",
                  boxShadow:
                    "0 0 0 3px #e7f3ef",
                }}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </Stack>

            <Stack as="label" gap="6px">
              <Text
                as="span"
                color="#6d7169"
                fontSize="11px"
                fontWeight="700"
              >
                Phone
              </Text>

              <Input
                value={draft.phone}
                minH="40px"
                borderColor="#c8c7bf"
                borderRadius="8px"
                bg="#ffffff"
                px="11px"
                _focus={{
                  borderColor: "#007854",
                  boxShadow:
                    "0 0 0 3px #e7f3ef",
                }}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
              />
            </Stack>

            <Stack
              as="label"
              gridColumn="1 / -1"
              gap="6px"
              css={{
                "@media (max-width: 620px)": {
                  gridColumn: "auto",
                },
              }}
            >
              <Text
                as="span"
                color="#6d7169"
                fontSize="11px"
                fontWeight="700"
              >
                Dietary notes
              </Text>

              <Input
                value={
                  draft.dietary_restrictions
                }
                minH="40px"
                borderColor="#c8c7bf"
                borderRadius="8px"
                bg="#ffffff"
                px="11px"
                _focus={{
                  borderColor: "#007854",
                  boxShadow:
                    "0 0 0 3px #e7f3ef",
                }}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    dietary_restrictions:
                      event.target.value,
                  }))
                }
              />
            </Stack>
          </Grid>

          {error && (
            <Box
              mt="14px"
              px="12px"
              py="10px"
              borderRadius="8px"
              bg="#fff0ef"
              color="#b63a33"
              fontSize="12px"
              fontWeight="650"
            >
              {error}
            </Box>
          )}

          <HStack
            mt="14px"
            gap="8px"
            css={{
              "@media (max-width: 620px)": {
                width: "100%",
              },
            }}
          >
            <Button
              type="button"
              disabled={
                busy ||
                !draft.full_name.trim()
              }
              minH="34px"
              borderWidth="1px"
              borderColor="#007854"
              borderRadius="8px"
              bg="#007854"
              px="14px"
              color="#ffffff"
              fontSize="12px"
              fontWeight="750"
              _hover={{
                borderColor: "#005d41",
                bg: "#005d41",
              }}
              onClick={() =>
                void savePerson()
              }
            >
              {busy
                ? "Saving…"
                : "Save changes"}
            </Button>

            <Button
              type="button"
              disabled={busy}
              minH="34px"
              borderWidth="1px"
              borderColor="#dddcd5"
              borderRadius="8px"
              bg="#ffffff"
              px="11px"
              fontSize="12px"
              fontWeight="650"
              onClick={closePersonForm}
            >
              Cancel
            </Button>
          </HStack>
        </Box>
      )}

      {error &&
        !adding &&
        !editingId && (
          <Box
            mx="16px"
            mb="16px"
            px="12px"
            py="10px"
            borderRadius="8px"
            bg="#fff0ef"
            color="#b63a33"
            fontSize="12px"
            fontWeight="650"
          >
            {error}
          </Box>
        )}
    </Box>
  );
}
