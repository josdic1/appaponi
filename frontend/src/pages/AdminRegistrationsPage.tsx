import {
  Alert,
  Badge,
  Box,
  Button,
  Field,
  Grid,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
} from "@chakra-ui/react";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  BedDouble,
  UsersRound,
} from "lucide-react";

import type {
  AccountRecord,
} from "@appoponi/shared/schemas/accounts";

import type {
  EventRecord,
} from "@appoponi/shared/schemas/events";

import type {
  EventRegistration,
} from "@appoponi/shared/schemas/registration";

import AdminCabinsPanel from "./AdminCabinsPanel";

import {
  createRegistration,
  loadAccounts,
  loadRegistrations,
  updateRegistrationSpots,
} from "../api/admin";

import {
  loadEvents,
} from "../api/operations";

import { AdminPageHeader } from "../components/AdminUi";
import PageSectionLayout from "../components/PageSectionLayout";

type Props = {
  activeEventId?: string;
};

export default function AdminRegistrationsPage({
  activeEventId = "",
}: Props) {
  const [accounts, setAccounts] =
    useState<AccountRecord[]>([]);

  const [events, setEvents] =
    useState<EventRecord[]>([]);

  const [
    registrations,
    setRegistrations,
  ] = useState<EventRegistration[]>([]);

  const [accountId, setAccountId] =
    useState("");

  const [eventId, setEventId] =
    useState("");

  const [spots, setSpots] =
    useState("1");

  const [error, setError] =
    useState<string | null>(null);

  const [showRegister, setShowRegister] =
    useState(false);

  const [view, setView] =
    useState<
      "households" | "cabins"
    >("households");

  async function refresh() {
    const [
      nextAccounts,
      nextEvents,
      nextRegistrations,
    ] = await Promise.all([
      loadAccounts(),
      loadEvents(),
      loadRegistrations(activeEventId || undefined),
    ]);

    setAccounts(
      nextAccounts.filter(
        (item) =>
          item.account_type ===
          "member",
      ),
    );

    setEvents(nextEvents);
    setRegistrations(
      nextRegistrations,
    );
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load registrations",
      ),
    );
  }, [activeEventId]);

  useEffect(() => {
    if (activeEventId) {
      setEventId(activeEventId);
    }
  }, [activeEventId]);

  const visibleRegistrations = registrations;

  const pageSections = [
    {
      id: "registrations-households",
      label: "Households",
      icon: UsersRound,
      active:
        view === "households",
      onClick: () =>
        setView("households"),
    },
    {
      id: "registrations-cabins",
      label: "Cabins",
      icon: BedDouble,
      active:
        view === "cabins",
      onClick: () =>
        setView("cabins"),
    },
  ];

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

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!accountId || !eventId) {
      setError("Choose a household and event.");
      return;
    }

    void run(async () => {
      await createRegistration({
        account_id: Number(accountId),
        event_id: Number(eventId),
        spots_paid_for: Number(spots),
      });

      setAccountId("");
      setEventId(activeEventId || "");
      setSpots("1");
      setShowRegister(false);
    });
  }

  return (
    <Box
      as="section"
      w="full"
    >
      <Stack gap="6">
        <Box
          display="flex"
          flexDirection={{
            base: "column",
            md: "row",
          }}
          alignItems={{
            base: "stretch",
            md: "flex-start",
          }}
          justifyContent="space-between"
          gap="4"
        >
          <AdminPageHeader
            eyebrow="Admin"
            title="Guests + cabins"
            description="See who is coming, where each household is staying, and the physical cabin location together."
          />

          <Button
            type="button"
            colorPalette="green"
            onClick={() =>
              setShowRegister(
                (open) => !open,
              )
            }
          >
            {showRegister
              ? "Close"
              : "Register household"}
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

        <PageSectionLayout
          items={pageSections}
          label="Guests and cabins sections"
        >
        <Stack gap="6">
        {showRegister && (
          <Box
            id="registrations-create"
            scrollMarginTop="96px"
            as="form"
            onSubmit={submit}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="xl"
            bg="white"
            p={{ base: "4", md: "5" }}
          >
            <Grid
              templateColumns={{
                base: "1fr",
                md: "minmax(0, 1fr) minmax(0, 1fr) 110px",
              }}
              gap="4"
              alignItems="end"
            >
              <Field.Root>
                <Field.Label>
                  Household
                </Field.Label>

                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={accountId}
                    onChange={(event) =>
                      setAccountId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Choose household
                    </option>

                    {accounts.map(
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
                  Event
                </Field.Label>

                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={eventId}
                    onChange={(event) =>
                      setEventId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Choose event
                    </option>

                    {events.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.name}
                        </option>
                      ),
                    )}
                  </NativeSelect.Field>

                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>

              <Field.Root>
                <Field.Label>
                  Paid spots
                </Field.Label>

                <Input
                  type="number"
                  min="1"
                  value={spots}
                  onChange={(event) =>
                    setSpots(
                      event.target.value,
                    )
                  }
                />
              </Field.Root>
            </Grid>

            <HStack mt="4">
              <Button
                type="submit"
                colorPalette="green"
              >
                Register
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setShowRegister(false)
                }
              >
                Cancel
              </Button>
            </HStack>
          </Box>
        )}

        <Box
          id="registrations-households"
          data-testid="registered-households-panel"
          display={
            view === "households"
              ? "block"
              : "none"
          }
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
              Registered households
            </Text>

            <Text
              fontSize="sm"
              color="gray.500"
            >
              {visibleRegistrations.length} households
            </Text>
          </Box>

          {visibleRegistrations.length ? (
            <Stack gap="0">
              {visibleRegistrations.map(
                (item) => (
                  <Box
                    key={item.id}
                    px="5"
                    py="4"
                    borderBottomWidth="1px"
                    borderColor="gray.100"
                  >
                    <Grid
                      templateColumns={{
                        base: "1fr",
                        lg: "minmax(0, 1.6fr) 92px minmax(140px, 0.7fr) auto",
                      }}
                      gap="4"
                      alignItems="center"
                    >
                      <Stack gap="0">
                        <Text fontWeight="700">
                          {item.household_name ??
                            item.username}
                        </Text>

                        <Text
                          fontSize="sm"
                          color="gray.500"
                        >
                          {item.selected_attendees}/
                          {item.spots_paid_for} attending · Lead:{" "}
                          {item.household_lead_name ??
                            "Not chosen"}
                        </Text>
                      </Stack>

                      <Field.Root>
                        <Field.Label
                          fontSize="xs"
                          color="gray.500"
                        >
                          Spots
                        </Field.Label>

                        <Input
                          type="number"
                          min="1"
                          value={
                            item.spots_paid_for
                          }
                          onChange={(event) => {
                            const value =
                              Number(
                                event.target
                                  .value,
                              );

                            if (
                              Number.isInteger(
                                value,
                              ) &&
                              value > 0
                            ) {
                              void run(() =>
                                updateRegistrationSpots(
                                  item.id,
                                  value,
                                ),
                              );
                            }
                          }}
                        />
                      </Field.Root>

                      <Stack gap="0">
                        <Text
                          fontSize="xs"
                          color="gray.500"
                        >
                          Cabin
                        </Text>

                        <Text fontWeight="700">
                          {item.cabin_name ??
                            "Unassigned"}
                        </Text>
                      </Stack>

                      <Badge
                        colorPalette={
                          item.cabin_id
                            ? "green"
                            : "gray"
                        }
                      >
                        {item.cabin_id
                          ? "Assigned"
                          : "No cabin"}
                      </Badge>
                    </Grid>
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
                No households registered yet.
              </Text>
            </Box>
          )}
        </Box>

        <Box
          id="registrations-cabins"
          data-testid="cabins-view"
          display={
            view === "cabins"
              ? "block"
              : "none"
          }
        >
          <AdminCabinsPanel
            activeEventId={activeEventId}
            onChanged={() =>
              void refresh()
            }
          />
        </Box>
        </Stack>
        </PageSectionLayout>
      </Stack>
    </Box>
  );
}
