import type {
  NextFunction,
  Request,
  Response,
} from "express";

import type {
  AccountType,
} from "@appoponi/shared/schemas/auth";

import {
  query,
} from "../db/db.js";

import {
  runWithAuditActor,
} from "../db/auditContext.js";

import {
  SESSION_COOKIE_NAME,
  verifyAccessToken,
  type AuthTokenPayload,
} from "../services/auth.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token =
    req.cookies?.[
      SESSION_COOKIE_NAME
    ];

  if (!token) {
    res.status(401).json({
      error:
        "Authentication required",
    });
    return;
  }

  try {
    req.auth =
      verifyAccessToken(token);

    runWithAuditActor(
      req.auth.sub,
      next,
    );
  } catch {
    res.status(401).json({
      error:
        "Invalid or expired session",
    });
  }
}

export async function requirePasswordChanged(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.auth) {
    res.status(401).json({
      error:
        "Authentication required",
    });
    return;
  }

  try {
    const result = await query<{
      must_change_password: boolean;
    }>(
      `
        SELECT must_change_password
        FROM accounts
        WHERE id = $1
        LIMIT 1
      `,
      [req.auth.sub],
    );

    const account =
      result.rows[0];

    if (!account) {
      res.status(401).json({
        error:
          "Account no longer exists",
      });
      return;
    }

    if (
      account.must_change_password
    ) {
      res.status(403).json({
        error:
          "PASSWORD_CHANGE_REQUIRED",
      });
      return;
    }

    next();
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error:
        "Authentication check failed",
    });
  }
}

export function requireAccountType(
  ...allowed: AccountType[]
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.auth) {
      res.status(401).json({
        error:
          "Authentication required",
      });
      return;
    }

    if (
      !allowed.includes(
        req.auth.account_type,
      )
    ) {
      res.status(403).json({
        error: "Forbidden",
      });
      return;
    }

    next();
  };
}
