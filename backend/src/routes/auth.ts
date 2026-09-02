import { Router } from "express";
import {
  rateLimit,
} from "express-rate-limit";

import {
  changePasswordSchema,
  loginSchema,
  type AccountType,
  type SessionAccount,
} from "@appoponi/shared/schemas/auth";

import {
  query,
} from "../db/db.js";

import {
  requireAuth,
} from "../middleware/auth.js";

import {
  SESSION_COOKIE_NAME,
  createAccessToken,
  hashPassword,
  sessionCookieOptions,
  verifyPassword,
} from "../services/auth.js";

type AuthAccountRow = {
  id: string;
  username: string;
  password_hash: string;
  account_type: AccountType;
  must_change_password: boolean;
};

export const authRouter =
  Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

authRouter.post(
  "/login",
  loginLimiter,
  async (req, res) => {
    const parsed =
      loginSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error:
          "Username and password are required",
      });
      return;
    }

    try {
      const result =
        await query<AuthAccountRow>(
          `
            SELECT
              id,
              username,
              password_hash,
              account_type,
              must_change_password
            FROM accounts
            WHERE regexp_replace(
              lower(username),
              '[[:space:]]+',
              '',
              'g'
            ) = regexp_replace(
              lower($1),
              '[[:space:]]+',
              '',
              'g'
            )
            LIMIT 1
          `,
          [
            parsed.data
              .username,
          ],
        );

      const account =
        result.rows[0];

      if (!account) {
        res.status(401).json({
          error:
            "Invalid username or password",
        });
        return;
      }

      const valid =
        await verifyPassword(
          parsed.data.password,
          account.password_hash,
        );

      if (!valid) {
        res.status(401).json({
          error:
            "Invalid username or password",
        });
        return;
      }

      const token =
        createAccessToken(
          account,
        );

      res.cookie(
        SESSION_COOKIE_NAME,
        token,
        sessionCookieOptions(),
      );

      const sessionAccount:
        SessionAccount = {
          id: account.id,
          username:
            account.username,
          account_type:
            account.account_type,
          must_change_password:
            account.must_change_password,
        };

      res.json({
        account: sessionAccount,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Login failed",
      });
    }
  },
);

authRouter.get(
  "/me",
  requireAuth,
  async (req, res) => {
    try {
      const result =
        await query<SessionAccount>(
          `
            SELECT
              id,
              username,
              account_type,
              must_change_password
            FROM accounts
            WHERE id = $1
            LIMIT 1
          `,
          [req.auth!.sub],
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

      res.json({ account });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Could not load account",
      });
    }
  },
);

authRouter.post(
  "/change-password",
  requireAuth,
  async (req, res) => {
    const parsed =
      changePasswordSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error:
          "Current password and new password are required",
      });
      return;
    }

    try {
      const result =
        await query<{
          password_hash: string;
        }>(
          `
            SELECT password_hash
            FROM accounts
            WHERE id = $1
            LIMIT 1
          `,
          [req.auth!.sub],
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

      const valid =
        await verifyPassword(
          parsed.data
            .current_password,
          account.password_hash,
        );

      if (!valid) {
        res.status(401).json({
          error:
            "Current password is incorrect",
        });
        return;
      }

      const passwordHash =
        await hashPassword(
          parsed.data.new_password,
        );

      await query(
        `
          UPDATE accounts
          SET
            password_hash = $1,
            must_change_password = FALSE
          WHERE id = $2
        `,
        [
          passwordHash,
          req.auth!.sub,
        ],
      );

      res.json({ ok: true });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Password change failed",
      });
    }
  },
);

authRouter.post(
  "/logout",
  (_req, res) => {
    res.clearCookie(
      SESSION_COOKIE_NAME,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite:
          process.env.NODE_ENV ===
          "production"
            ? "none"
            : "lax",
        path: "/",
      },
    );

    res.json({ ok: true });
  },
);
