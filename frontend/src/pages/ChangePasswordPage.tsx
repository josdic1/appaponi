import {
  useState,
  type FormEvent,
} from "react";

import {
  changePassword,
} from "../api/auth";

import {
  useAuth,
} from "../hooks/useAuth";

export default function ChangePasswordPage() {
  const { refresh, logout } = useAuth();

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError(
        "New password must be at least 8 characters.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "New passwords do not match.",
      );
      return;
    }

    setSubmitting(true);

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Password change failed",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <form
        className="login-card"
        onSubmit={submit}
      >
        <div className="login-brand">
          <div className="brand-mark">
            A
          </div>

          <div>
            <div className="brand-name">
              Appoponi
            </div>

            <div className="brand-sub">
              Camp App
            </div>
          </div>
        </div>

        <div className="login-heading">
          <h1>Set your password</h1>

          <p>
            Replace the temporary password
            before continuing.
          </p>
        </div>

        <label>
          <span>Temporary password</span>

          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) =>
              setCurrentPassword(
                event.target.value,
              )
            }
          />
        </label>

        <label>
          <span>New password</span>

          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) =>
              setNewPassword(
                event.target.value,
              )
            }
          />
        </label>

        <label>
          <span>Confirm new password</span>

          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(
                event.target.value,
              )
            }
          />
        </label>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <button
          className="login-submit"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? "Saving…"
            : "Set password"}
        </button>

        <button
          className="login-secondary"
          type="button"
          onClick={() => {
            void logout();
          }}
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
