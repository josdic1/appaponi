import {
  Box,
  Button,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  useEffect,
  useState,
} from "react";

import type {
  AccountType,
} from "@appoponi/shared/schemas/auth";

import {
  devLogin,
  getDevAccounts,
  type DevAccount,
} from "../../api/dev";

import { useAuth } from "../../hooks/useAuth";

const categories: Array<{
  type: AccountType;
  label: string;
}> = [
  { type: "member", label: "Members" },
  { type: "staff", label: "Staff" },
  { type: "admin", label: "Admins" },
];

export default function DevLoginMenu() {
  const { refresh } = useAuth();

  const [open, setOpen] =
    useState(false);

  const [accounts, setAccounts] =
    useState<DevAccount[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [switching, setSwitching] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoading(true);
    setError(null);

    getDevAccounts()
      .then(setAccounts)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Could not load accounts",
        ),
      )
      .finally(() =>
        setLoading(false),
      );
  }, [open]);

  async function switchAccount(
    account: DevAccount,
  ) {
    setSwitching(account.id);
    setError(null);

    try {
      await devLogin(account.id);
      await refresh();
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Development login failed",
      );
    } finally {
      setSwitching(null);
    }
  }


  return (
    <Box
      position="fixed"
      right="4"
      bottom="4"
      zIndex="10"
    >
      {open && (
        <Box
          mb="2"
          w="320px"
          maxW="calc(100vw - 32px)"
          maxH="420px"
          overflowY="auto"
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="lg"
          p="4"
          boxShadow="lg"
        >
          {loading ? (
            <Text
              fontSize="sm"
              color="gray.600"
            >
              Loading users…
            </Text>
          ) : error ? (
            <Text
              fontSize="sm"
              color="red.600"
            >
              {error}
            </Text>
          ) : (
            <Stack gap="5">
              {categories.map(
                (category) => {
                  const rows =
                    accounts.filter(
                      (account) =>
                        account.account_type ===
                        category.type,
                    );

                  if (!rows.length) {
                    return null;
                  }

                  return (
                    <Stack
                      gap="2"
                      key={category.type}
                    >
                      <Text
                        fontSize="xs"
                        fontWeight="700"
                        color="gray.500"
                        textTransform="uppercase"
                        letterSpacing="wide"
                      >
                        {category.label}
                      </Text>

                      <Stack gap="1">
                        {rows.map(
                          (account) => (
                            <Button
                              key={account.id}
                              type="button"
                              variant="ghost"
                              justifyContent="space-between"
                              h="auto"
                              py="2"
                              px="3"
                              disabled={
                                switching !==
                                null
                              }
                              onClick={() =>
                                void switchAccount(
                                  account,
                                )
                              }
                            >
                              <Box
                                textAlign="left"
                                minW="0"
                              >
                                <Text
                                  fontWeight="600"
                                  truncate
                                >
                                  {account.display_name ??
                                    account.username}
                                </Text>

                                <Text
                                  fontSize="xs"
                                  color="gray.500"
                                  fontWeight="400"
                                >
                                  @{account.username}
                                </Text>
                              </Box>

                              <Text
                                fontSize="xs"
                                color="gray.500"
                              >
                                {switching ===
                                account.id
                                  ? "…"
                                  : account.must_change_password
                                    ? "setup"
                                    : ""}
                              </Text>
                            </Button>
                          ),
                        )}
                      </Stack>
                    </Stack>
                  );
                },
              )}
            </Stack>
          )}
        </Box>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        bg="white"
        onClick={() =>
          setOpen(
            (current) => !current,
          )
        }
      >
        DEV LOGIN {open ? "×" : "↓"}
      </Button>
    </Box>
  );
}
