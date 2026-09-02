import {
  createContext,
} from "react";

import type {
  LoginInput,
  SessionAccount,
} from "@appoponi/shared/schemas/auth";

export type AuthContextValue = {
  account: SessionAccount | null;
  loading: boolean;
  login: (
    input: LoginInput,
  ) => Promise<SessionAccount>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

export const AuthContext =
  createContext<AuthContextValue | null>(
    null,
  );
