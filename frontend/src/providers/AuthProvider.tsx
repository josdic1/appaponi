import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type {
  LoginInput,
  SessionAccount,
} from "@appoponi/shared/schemas/auth";

import {
  getCurrentAccount,
  loginAccount,
  logoutAccount,
} from "../api/auth";

import {
  AuthContext,
} from "../contexts/AuthContext";

import {
  isOfflineFetchFailure,
  readOfflineCache,
  removeOfflineCache,
  saveOfflineCache,
} from "../lib/offlineCache";

const SESSION_CACHE_KEY =
  "session-account";

export default function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    account,
    setAccount,
  ] =
    useState<SessionAccount | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const refresh =
    useCallback(async () => {
      setLoading(true);

      try {
        const current =
          await getCurrentAccount();

        setAccount(current);

        if (current) {
          saveOfflineCache(
            SESSION_CACHE_KEY,
            current,
          );
        } else {
          removeOfflineCache(
            SESSION_CACHE_KEY,
          );
        }
      } catch (error) {
        const cached =
          readOfflineCache<SessionAccount>(
            SESSION_CACHE_KEY,
          );

        if (
          isOfflineFetchFailure(
            error,
          ) &&
          cached
        ) {
          setAccount(cached.value);
        } else {
          throw error;
        }
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function login(
    input: LoginInput,
  ) {
    const authenticated =
      await loginAccount(input);

    setAccount(authenticated);

    saveOfflineCache(
      SESSION_CACHE_KEY,
      authenticated,
    );

    return authenticated;
  }

  async function logout() {
    await logoutAccount();
    setAccount(null);

    removeOfflineCache(
      SESSION_CACHE_KEY,
    );
  }

  return (
    <AuthContext.Provider
      value={{
        account,
        loading,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
