import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Box,
  Button,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";

import type {
  MemberDirectoryHousehold,
} from "@appoponi/shared/schemas/registration";

import {
  loadMemberDirectory,
  updateMemberDirectorySharing,
} from "../api/member";

import {
  isOfflineFetchFailure,
  readOfflineCache,
  saveOfflineCache,
} from "../lib/offlineCache";

type Props = {
  eventId: string;
  cacheIdentity: string;
  changesUnavailable: boolean;
};

function countLabel(
  count: number,
  singular: string,
  plural: string,
) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function MemberDirectory({
  eventId,
  cacheIdentity,
  changesUnavailable,
}: Props) {
  const [households, setHouseholds] =
    useState<MemberDirectoryHousehold[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [usingCachedDirectory, setUsingCachedDirectory] =
    useState(false);

  const [sharingBusy, setSharingBusy] =
    useState(false);

  function cacheKey() {
    return `member-directory:${cacheIdentity}:${eventId}`;
  }

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setSearch("");
    setHouseholds([]);
    setUsingCachedDirectory(false);

    void loadMemberDirectory(eventId)
      .then((next) => {
        if (cancelled) {
          return;
        }

        setHouseholds(next);
        setUsingCachedDirectory(false);
        saveOfflineCache(
          cacheKey(),
          next,
        );
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        const cached =
          readOfflineCache<
            MemberDirectoryHousehold[]
          >(cacheKey());

        if (
          isOfflineFetchFailure(err) &&
          cached
        ) {
          setHouseholds(cached.value);
          setUsingCachedDirectory(true);
          return;
        }

        setHouseholds([]);
        setError(
          err instanceof Error
            ? err.message
            : "Could not load the event directory",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, cacheIdentity]);

  const ownHousehold =
    households.find(
      (item) => item.is_own_household,
    ) ?? null;

  const totalPeople = households.reduce(
    (sum, item) =>
      sum + item.members.length,
    0,
  );

  const filteredHouseholds = useMemo(() => {
    const term = search
      .trim()
      .toLowerCase();

    if (!term) {
      return households;
    }

    return households.filter((item) =>
      [
        item.household_name,
        item.cabin_name ?? "",
        ...item.members.map(
          (member) => member.full_name,
        ),
      ].some((value) =>
        value
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [households, search]);

  async function toggleCabinSharing() {
    if (!ownHousehold) {
      return;
    }

    setSharingBusy(true);
    setError(null);

    try {
      const next =
        !ownHousehold.cabin_shared;

      const updated =
        await updateMemberDirectorySharing(
          eventId,
          next,
        );

      setHouseholds((current) => {
        const changed = current.map(
          (item) =>
            item.is_own_household
              ? {
                  ...item,
                  cabin_shared:
                    updated.share_cabin_publicly,
                }
              : item,
        );

        saveOfflineCache(
          cacheKey(),
          changed,
        );

        return changed;
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update cabin visibility",
      );
    } finally {
      setSharingBusy(false);
    }
  }

  return (
    <Box
      as="section"
      mb="0"
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
        gap="14px"
        px="16px"
        py="13px"
        borderBottomWidth="1px"
        borderColor="#dddcd5"
      >
        <Stack
          minW="0"
          gap="3px"
        >
          <Text
            as="strong"
            fontWeight="700"
          >
            Who&apos;s here
          </Text>

          <Text
            as="span"
            color="#6d7169"
            fontSize="11px"
          >
            {loading
              ? "Loading directory…"
              : `${countLabel(
                  households.length,
                  "household",
                  "households",
                )} · ${countLabel(
                  totalPeople,
                  "guest",
                  "guests",
                )}`}
            {usingCachedDirectory
              ? " · saved copy"
              : ""}
          </Text>
        </Stack>
      </Box>

      {ownHousehold?.cabin_name && (
        <Box
          minH="62px"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap="14px"
          pl="16px"
          pr="14px"
          py="10px"
          borderBottomWidth="1px"
          borderColor="#dddcd5"
          bg="#fbfaf7"
          css={{
            "@media (max-width: 700px)": {
              alignItems: "flex-start",
              flexDirection: "column",
            },
          }}
        >
          <Stack
            minW="0"
            gap="3px"
          >
            <Text
              as="strong"
              fontSize="11px"
              fontWeight="700"
            >
              Cabin in directory
            </Text>

            <Text
              as="span"
              color="#6d7169"
              fontSize="10px"
              lineHeight="1.4"
            >
              {ownHousehold.cabin_shared
                ? `${ownHousehold.cabin_name} is visible to other households at this event.`
                : `${ownHousehold.cabin_name} is visible only to your household.`}
            </Text>
          </Stack>

          <Button
            type="button"
            disabled={
              changesUnavailable ||
              sharingBusy
            }
            minH="34px"
            h="34px"
            flex="0 0 auto"
            borderWidth="1px"
            borderColor="#dddcd5"
            borderRadius="8px"
            bg="#ffffff"
            px="11px"
            color="#171915"
            fontSize="12px"
            fontWeight="650"
            _hover={{
              borderColor: "#c8c7bf",
              bg: "#fbfaf7",
            }}
            css={{
              "@media (max-width: 700px)": {
                width: "100%",
              },
            }}
            onClick={() =>
              void toggleCabinSharing()
            }
          >
            {sharingBusy
              ? "Saving…"
              : ownHousehold.cabin_shared
                ? "Hide cabin"
                : "Share cabin"}
          </Button>
        </Box>
      )}

      {households.length > 4 && (
        <Box
          px="12px"
          py="10px"
          borderBottomWidth="1px"
          borderColor="#dddcd5"
        >
          <Input
            aria-label="Search event directory"
            type="search"
            placeholder="Find a household or guest"
            value={search}
            w="full"
            minH="40px"
            borderColor="#c8c7bf"
            borderRadius="8px"
            bg="#ffffff"
            px="11px"
            color="#171915"
            _focus={{
              borderColor: "#007854",
              boxShadow:
                "0 0 0 3px #e7f3ef",
            }}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </Box>
      )}

      {error && (
        <Box
          role="alert"
          mx="12px"
          my="10px"
          px="12px"
          py="10px"
          borderWidth="1px"
          borderColor="transparent"
          borderRadius="8px"
          bg="#fff0ef"
          color="#b63a33"
          fontSize="12px"
          fontWeight="650"
        >
          {error}
        </Box>
      )}

      {!loading &&
      !error &&
      filteredHouseholds.length === 0 ? (
        <Box
          px="14px"
          py="16px"
          color="#6d7169"
          textAlign="left"
          fontSize="12px"
        >
          {search
            ? "No households or guests match that search."
            : "No households are in this event yet."}
        </Box>
      ) : (
        <Stack gap="0">
          {filteredHouseholds.map(
            (item) => (
              <Box
                as="article"
                key={item.registration_id}
                minW="0"
                px="14px"
                pt="12px"
                pb="13px"
                borderBottomWidth="1px"
                borderColor="#dddcd5"
                css={{
                  "&:last-child": {
                    borderBottomWidth: "0",
                  },
                }}
              >
                <Box
                  display="flex"
                  alignItems="flex-start"
                  justifyContent="space-between"
                  gap="12px"
                >
                  <Stack
                    minW="0"
                    gap="2px"
                  >
                    <Text
                      as="strong"
                      overflow="hidden"
                      fontWeight="700"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                    >
                      {item.household_name}
                    </Text>

                    <Text
                      as="span"
                      color="#6d7169"
                      fontSize="10px"
                    >
                      {countLabel(
                        item.members.length,
                        "guest",
                        "guests",
                      )}
                      {item.is_own_household
                        ? " · Your household"
                        : ""}
                    </Text>
                  </Stack>

                  {item.cabin_name && (
                    <Text
                      as="small"
                      flex="0 0 auto"
                      pt="2px"
                      color="#6d7169"
                      fontSize="10px"
                      fontWeight="750"
                      css={{
                        "@media (max-width: 700px)": {
                          maxWidth: "42%",
                          overflow: "hidden",
                          textOverflow:
                            "ellipsis",
                          whiteSpace: "nowrap",
                        },
                      }}
                    >
                      {item.cabin_name}
                    </Text>
                  )}
                </Box>

                {item.members.length ? (
                  <Box
                    display="flex"
                    flexWrap="wrap"
                    gap="6px 12px"
                    mt="8px"
                  >
                    {item.members.map(
                      (member) => (
                        <Box
                          as="span"
                          key={
                            member.attendee_id
                          }
                          position="relative"
                          pl="9px"
                          fontSize="11px"
                          css={{
                            "&::before": {
                              content: '""',
                              width: "3px",
                              height: "3px",
                              position:
                                "absolute",
                              left: "0",
                              top: "0.55em",
                              borderRadius:
                                "50%",
                              background:
                                "#c8c7bf",
                            },
                          }}
                        >
                          {member.full_name}
                        </Box>
                      ),
                    )}
                  </Box>
                ) : (
                  <Text
                    mt="8px"
                    color="#6d7169"
                    fontSize="10px"
                  >
                    Guest names not selected yet.
                  </Text>
                )}
              </Box>
            ),
          )}
        </Stack>
      )}

      <Box
        px="14px"
        py="10px"
        borderTopWidth="1px"
        borderColor="#dddcd5"
        bg="#fbfaf7"
        color="#6d7169"
        fontSize="10px"
        lineHeight="1.45"
      >
        The directory shares household and attending guest names only.
        Contact and dietary details stay private.
      </Box>
    </Box>
  );
}
