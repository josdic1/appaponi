import {
  useState,
  type FormEvent,
} from "react";

import {
  useAuth,
} from "../hooks/useAuth";

export default function LoginPage() {
  const { login } = useAuth();

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
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
    setSubmitting(true);

    try {
      await login({
        username,
        password,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed",
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
          <h1>Sign in</h1>
          <p>
            Enter your Appoponi
            account.
          </p>
        </div>

        <label>
          <span>Username</span>
          <input
            autoComplete="username"
            value={username}
            onChange={(event) =>
              setUsername(
                event.target.value,
              )
            }
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) =>
              setPassword(
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
            ? "Signing in…"
            : "Sign in"}
        </button>
      </form>
    </main>
  );
}
