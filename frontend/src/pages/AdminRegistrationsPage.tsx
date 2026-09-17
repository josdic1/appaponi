import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import type {
  AccountRecord,
} from "@appoponi/shared/schemas/accounts";

import type {
  EventRecord,
} from "@appoponi/shared/schemas/events";

import type {
  EventRegistration,
} from "@appoponi/shared/schemas/registration";

import AdminCabinsPanel from "./AdminCabinsPanel";

import {
  createRegistration,
  loadAccounts,
  loadRegistrations,
  updateRegistrationSpots,
} from "../api/admin";

import {
  loadEvents,
} from "../api/operations";

type Props = {
  activeEventId?: string;
};

export default function AdminRegistrationsPage({
  activeEventId = "",
}: Props) {
  const [accounts, setAccounts] =
    useState<AccountRecord[]>([]);

  const [events, setEvents] =
    useState<EventRecord[]>([]);

  const [
    registrations,
    setRegistrations,
  ] = useState<EventRegistration[]>([]);

  const [accountId, setAccountId] =
    useState("");

  const [eventId, setEventId] =
    useState("");

  const [spots, setSpots] =
    useState("1");

  const [error, setError] =
    useState<string | null>(null);

  const [showRegister, setShowRegister] =
    useState(false);

  async function refresh() {
    const [
      nextAccounts,
      nextEvents,
      nextRegistrations,
    ] = await Promise.all([
      loadAccounts(),
      loadEvents(),
      loadRegistrations(activeEventId || undefined),
    ]);

    setAccounts(
      nextAccounts.filter(
        (item) =>
          item.account_type ===
          "member",
      ),
    );

    setEvents(nextEvents);
    setRegistrations(
      nextRegistrations,
    );
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load registrations",
      ),
    );
  }, [activeEventId]);

  useEffect(() => {
    if (activeEventId) {
      setEventId(activeEventId);
    }
  }, [activeEventId]);

  const visibleRegistrations = registrations;

  async function run(
    action: () => Promise<unknown>,
  ) {
    setError(null);

    try {
      await action();
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Request failed",
      );
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!accountId || !eventId) {
      setError("Choose a household and event.");
      return;
    }

    void run(async () => {
      await createRegistration({
        account_id: Number(accountId),
        event_id: Number(eventId),
        spots_paid_for: Number(spots),
      });

      setAccountId("");
      setEventId(activeEventId || "");
      setSpots("1");
      setShowRegister(false);
    });
  }

  return (
    <section className="admin-workspace">
      <div className="admin-heading admin-heading-split">
        <div>
          <div className="admin-eyebrow">ADMIN</div>
          <h1>Guests + cabins</h1>
          <p>
            See who is coming, where each household is staying, and the physical cabin location together.
          </p>
        </div>

        <button
          className="app-button app-button-primary"
          type="button"
          onClick={() => setShowRegister((open) => !open)}
        >
          {showRegister ? "Close" : "Register household"}
        </button>
      </div>

      {error && <div className="app-alert app-alert-danger">{error}</div>}

      {showRegister && (
        <form className="app-card admin-form app-action-panel" onSubmit={submit}>
          <label>
            <span>Household</span>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Choose household</option>
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>{item.display_name ?? item.username}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Event</span>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">Choose event</option>
              {events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span>Paid spots</span>
            <input className="app-control-number" type="number" min="1" value={spots} onChange={(e) => setSpots(e.target.value)} />
          </label>
          <div className="app-action-panel-actions">
            <button className="app-button" type="button" onClick={() => setShowRegister(false)}>Cancel</button>
            <button className="app-button app-button-primary" type="submit">Register</button>
          </div>
        </form>
      )}

      <section className="app-card registration-card registration-first">
        <div className="app-card-head">
          <div>
            <strong>Registered households</strong>
            <span>{visibleRegistrations.length} households</span>
          </div>
        </div>

        <div className="registration-list">
          {visibleRegistrations.length ? (
            visibleRegistrations.map((item) => (
              <div className="registration-row" key={item.id}>
                <div className="registration-account-row">
                  <strong>{item.household_name ?? item.username}</strong>
                  <span>
                    {item.selected_attendees}/{item.spots_paid_for} attending · Lead: {item.household_lead_name ?? "Not chosen"}
                  </span>
                </div>

                <label className="registration-compact-field">
                  <small>Spots</small>
                  <input
                    className="app-control-number"
                    type="number"
                    min="1"
                    value={item.spots_paid_for}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (Number.isInteger(value) && value > 0) {
                        void run(() => updateRegistrationSpots(item.id, value));
                      }
                    }}
                  />
                </label>

                <div className="registration-cabin-summary">
                  <small>Cabin</small>
                  <strong>{item.cabin_name ?? "Unassigned"}</strong>
                </div>

                <span className="registration-map-state">
                  {item.cabin_map_slot_id ? "On map" : item.cabin_id ? "Place cabin" : "No cabin"}
                </span>
              </div>
            ))
          ) : (
            <div className="app-empty">No households registered yet.</div>
          )}
        </div>
      </section>

      <AdminCabinsPanel
        activeEventId={activeEventId}
        onChanged={() => void refresh()}
      />
    </section>
  );
}
