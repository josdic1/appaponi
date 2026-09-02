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
        setAccount(
          await getCurrentAccount(),
        );
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
    return authenticated;
  }

  async function logout() {
    await logoutAccount();
    setAccount(null);
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
