import type {
  ChangePasswordInput,
  LoginInput,
  SessionAccount,
} from "@appoponi/shared/schemas/auth";

const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

async function readError(
  response: Response,
  fallback: string,
): Promise<Error> {
  try {
    const data = await response.json();
    return new Error(
      data.error ?? fallback,
    );
  } catch {
    return new Error(fallback);
  }
}

export async function getCurrentAccount():
  Promise<SessionAccount | null> {
  const response = await fetch(
    `${API_URL}/api/auth/me`,
    {
      credentials: "include",
    },
  );

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw await readError(
      response,
      "Could not load session",
    );
  }

  const data =
    (await response.json()) as {
      account: SessionAccount;
    };

  return data.account;
}

export async function loginAccount(
  input: LoginInput,
): Promise<SessionAccount> {
  const response = await fetch(
    `${API_URL}/api/auth/login`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw await readError(
      response,
      "Login failed",
    );
  }

  const data =
    (await response.json()) as {
      account: SessionAccount;
    };

  return data.account;
}

export async function logoutAccount():
  Promise<void> {
  const response = await fetch(
    `${API_URL}/api/auth/logout`,
    {
      method: "POST",
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw await readError(
      response,
      "Logout failed",
    );
  }
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/auth/change-password`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw await readError(
      response,
      "Password change failed",
    );
  }
}
