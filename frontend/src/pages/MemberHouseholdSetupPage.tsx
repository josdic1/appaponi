import {
  useState,
} from "react";

import {
  setupOwnHousehold,
} from "../api/member";

import { useAuth } from "../hooks/useAuth";

type Props = {
  onComplete: () => void;
};

export default function MemberHouseholdSetupPage({
  onComplete,
}: Props) {
  const { logout } = useAuth();

  const [
    householdName,
    setHouseholdName,
  ] = useState("");

  const [
    fullName,
    setFullName,
  ] = useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [dietary, setDietary] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function submit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setError(null);

    try {
      await setupOwnHousehold({
        household_name:
          householdName,
        full_name: fullName,
        ...(email.trim()
          ? {
              email:
                email.trim(),
            }
          : {}),
        ...(phone.trim()
          ? {
              phone:
                phone.trim(),
            }
          : {}),
        ...(dietary.trim()
          ? {
              dietary_restrictions:
                dietary.trim(),
            }
          : {}),
      });

      onComplete();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not set up household",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card household-setup-card">
        <div className="login-brand">
          <div className="brand-mark">
            A
          </div>

          <div>
            <div className="brand-name">
              Appaponi
            </div>

            <div className="brand-sub">
              Household setup
            </div>
          </div>
        </div>

        <div className="login-heading">
          <h1>
            Set up your household
          </h1>

          <p>
            Add the household name
            and your own profile.
            You&apos;ll become the default
            household lead. The login
            still belongs to the household.
          </p>
        </div>

        <form
          className="household-setup-form"
          onSubmit={submit}
        >
          <label>
            <span>
              Household name
            </span>

            <input
              autoFocus
              required
              value={householdName}
              placeholder="Dicker Family"
              onChange={(event) =>
                setHouseholdName(
                  event.target.value,
                )
              }
            />
          </label>

          <label>
            <span>Your full name</span>

            <input
              required
              value={fullName}
              placeholder="Josh Dicker"
              onChange={(event) =>
                setFullName(
                  event.target.value,
                )
              }
            />
          </label>

          <label>
            <span>Email</span>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
            />
          </label>

          <label>
            <span>Phone</span>

            <input
              value={phone}
              onChange={(event) =>
                setPhone(
                  event.target.value,
                )
              }
            />
          </label>

          <label>
            <span>
              Dietary notes
            </span>

            <input
              value={dietary}
              onChange={(event) =>
                setDietary(
                  event.target.value,
                )
              }
            />
          </label>

          {error && (
            <div className="app-alert app-alert-danger">
              {error}
            </div>
          )}

          <button
            className="app-button app-button-primary app-button-block"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saving…"
              : "Create household"}
          </button>

          <button
            className="household-setup-signout"
            type="button"
            onClick={() =>
              void logout()
            }
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
