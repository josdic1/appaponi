import argon2 from "argon2";
import jwt, {
  type JwtPayload,
} from "jsonwebtoken";

import type {
  AccountType,
} from "@appoponi/shared/schemas/auth";

export const SESSION_COOKIE_NAME =
  "appoponi_session";

export type AuthTokenPayload = {
  sub: string;
  username: string;
  account_type: AccountType;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is required",
    );
  }

  return secret;
}

function getSessionHours(): number {
  const hours = Number(
    process.env.SESSION_HOURS ?? "720",
  );

  if (
    !Number.isFinite(hours) ||
    hours <= 0
  ) {
    throw new Error(
      "SESSION_HOURS must be positive",
    );
  }

  return hours;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite:
      process.env.NODE_ENV ===
      "production"
        ? ("none" as const)
        : ("lax" as const),
    maxAge:
      getSessionHours() *
      60 *
      60 *
      1000,
    path: "/",
  };
}

export async function hashPassword(
  password: string,
): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
  });
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    return await argon2.verify(
      hash,
      password,
    );
  } catch {
    return false;
  }
}

export function createAccessToken(
  account: {
    id: string | number;
    username: string;
    account_type: AccountType;
  },
): string {
  return jwt.sign(
    {
      username: account.username,
      account_type:
        account.account_type,
    },
    getJwtSecret(),
    {
      subject: String(account.id),
      expiresIn:
        getSessionHours() *
        60 *
        60,
    },
  );
}

export function verifyAccessToken(
  token: string,
): AuthTokenPayload {
  const decoded = jwt.verify(
    token,
    getJwtSecret(),
  );

  if (typeof decoded === "string") {
    throw new Error("Invalid token");
  }

  const payload =
    decoded as JwtPayload;

  const accountType =
    String(payload.account_type);

  if (
    typeof payload.sub !== "string" ||
    typeof payload.username !==
      "string" ||
    ![
      "member",
      "staff",
      "admin",
    ].includes(accountType)
  ) {
    throw new Error("Invalid token");
  }

  return {
    sub: payload.sub,
    username: payload.username,
    account_type:
      accountType as AccountType,
  };
}
