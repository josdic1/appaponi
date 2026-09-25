import type {
  AccountType,
  SessionAccount,
} from "@appoponi/shared/schemas/auth";

const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

export type DevAccount = {
  id: string;
  username: string;
  display_name: string | null;
  account_type: AccountType;
  must_change_password: boolean;
};

async function readJson<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ?? fallback,
    );
  }

  return data as T;
}

export async function getDevAccounts():
  Promise<DevAccount[]> {
  const response = await fetch(
    `${API_URL}/api/dev/accounts`,
    {
      credentials: "include",
    },
  );

  return (
    await readJson<{
      accounts: DevAccount[];
    }>(
      response,
      "Could not load development accounts",
    )
  ).accounts;
}

export async function devLogin(
  id: string,
): Promise<SessionAccount> {
  const response = await fetch(
    `${API_URL}/api/dev/login/${id}`,
    {
      method: "POST",
      credentials: "include",
    },
  );

  return (
    await readJson<{
      account: SessionAccount;
    }>(
      response,
      "Development login failed",
    )
  ).account;
}


export type DemoAction =
  | "clear-people-events"
  | "clear-guests-events"
  | "seed-alumni-weekend"
  | "seed-family-camp";

export async function runDemoAction(
  action: DemoAction,
) {
  const response = await fetch(
    `${API_URL}/api/dev/demo/${action}`,
    {
      method: "POST",
      credentials: "include",
    },
  );

  return readJson<{
    mode: DemoAction;
    message: string;
  }>(
    response,
    "Demo action failed",
  );
}
