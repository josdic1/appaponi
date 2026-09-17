import {
  useEffect,
  useState,
} from "react";

import type {
  HouseholdMember,
} from "@appoponi/shared/schemas/householdMembers";

import {
  MataponiLoader,
} from "../components/feedback/MataponiLoader";

import {
  loadOwnHousehold,
} from "../api/member";

import { useAuth } from "../hooks/useAuth";

import MemberHouseholdSetupPage from "./MemberHouseholdSetupPage";
import MemberPage from "./MemberPage";

export default function MemberHouseholdGate() {
  const { logout } = useAuth();

  const [
    household,
    setHousehold,
  ] = useState<
    HouseholdMember[] | null
  >(null);

  const [error, setError] =
    useState<string | null>(null);

  async function refresh() {
    try {
      const next =
        await loadOwnHousehold();

      setHousehold(next);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load household",
      );
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (
    household === null &&
    !error
  ) {
    return <MataponiLoader />;
  }

  if (error) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-heading">
            <h1>
              Could not load household
            </h1>

            <p>{error}</p>
          </div>

          <button
            className="app-button app-button-primary app-button-block"
            type="button"
            onClick={() =>
              void refresh()
            }
          >
            Try again
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
        </section>
      </main>
    );
  }

  if (
    household &&
    household.length === 0
  ) {
    return (
      <MemberHouseholdSetupPage
        onComplete={() =>
          void refresh()
        }
      />
    );
  }

  return <MemberPage />;
}
