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

import type {
  Cabin,
} from "@appoponi/shared/schemas/cabins";

import AdminCabinsPanel from "./AdminCabinsPanel";

import {
  assignRegistrationCabin,
  createRegistration,
  loadAccounts,
  loadCabins,
  loadRegistrations,
  updateRegistrationSpots,
} from "../api/admin";

import {
  loadEvents,
} from "../api/operations";

export default function AdminRegistrationsPage() {
  const [accounts, setAccounts] =
    useState<AccountRecord[]>([]);

  const [events, setEvents] =
    useState<EventRecord[]>([]);

  const [
    registrations,
    setRegistrations,
  ] = useState<EventRegistration[]>([]);

  const [cabins, setCabins] =
    useState<Cabin[]>([]);

  const [accountId, setAccountId] =
    useState("");

  const [eventId, setEventId] =
    useState("");

  const [spots, setSpots] =
    useState("1");

  const [error, setError] =
    useState<string | null>(null);

  async function refresh() {
    const [
      nextAccounts,
      nextEvents,
      nextRegistrations,
      nextCabins,
    ] = await Promise.all([
      loadAccounts(),
      loadEvents(),
      loadRegistrations(),
      loadCabins(),
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
    setCabins(nextCabins);
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load registrations",
      ),
    );
  }, []);

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

  function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!accountId || !eventId) {
      setError(
        "Choose a household and event.",
      );
      return;
    }

    void run(async () => {
      await createRegistration({
        account_id:
          Number(accountId),
        event_id:
          Number(eventId),
        spots_paid_for:
          Number(spots),
      });

      setAccountId("");
      setEventId("");
      setSpots("1");
    });
  }

  return (
    <section>
      <div className="admin-heading">
        <div className="admin-eyebrow">
          ADMIN
        </div>

        <h1>Registrations</h1>

        <p>
          Register a household for an
          event and record how many
          attendee spots were purchased.
        </p>
      </div>

      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      <div className="admin-grid">
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <strong>
                Register household
              </strong>

              <span>
                Event access starts here.
              </span>
            </div>
          </div>

          <form
            className="admin-form"
            onSubmit={submit}
          >
            <label>
              <span>Household</span>

              <select
                value={accountId}
                onChange={(e) =>
                  setAccountId(
                    e.target.value,
                  )
                }
              >
                <option value="">
                  Choose member account
                </option>

                {accounts.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.username}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span>Event</span>

              <select
                value={eventId}
                onChange={(e) =>
                  setEventId(
                    e.target.value,
                  )
                }
              >
                <option value="">
                  Choose event
                </option>

                {events.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span>Paid spots</span>

              <input
                type="number"
                min="1"
                value={spots}
                onChange={(e) =>
                  setSpots(
                    e.target.value,
                  )
                }
              />
            </label>

            <button
              className="admin-primary"
              type="submit"
            >
              Register household
            </button>
          </form>
        </section>

        <AdminCabinsPanel
          onChanged={() => {
            void refresh();
          }}
        />

        <section className="admin-card registration-card">
          <div className="admin-card-head">
            <div>
              <strong>
                Registered households
              </strong>

              <span>
                {registrations.length} total
              </span>
            </div>
          </div>

          <div className="registration-list">
            {registrations.length ? (
              registrations.map(
                (item) => (
                  <div
                    className="registration-row registration-account-row"
                    key={item.id}
                  >
                    <div>
                      <strong>
                        {item.username}
                      </strong>

                      <span>
                        {item.event_name}
                      </span>
                    </div>

                    <label>
                      <small>
                        Spots
                      </small>

                      <input
                        type="number"
                        min="1"
                        value={
                          item.spots_paid_for
                        }
                        onChange={(e) => {
                          const value =
                            Number(
                              e.target
                                .value,
                            );

                          if (
                            Number.isInteger(
                              value,
                            ) &&
                            value > 0
                          ) {
                            void run(
                              () =>
                                updateRegistrationSpots(
                                  item.id,
                                  value,
                                ),
                            );
                          }
                        }}
                      />
                    </label>

                    <label>
                      <small>
                        Cabin
                      </small>

                      <select
                        value={
                          item.cabin_id ??
                          ""
                        }
                        onChange={(e) =>
                          void run(() =>
                            assignRegistrationCabin(
                              item.id,
                              e.target
                                .value
                                ? Number(
                                    e
                                      .target
                                      .value,
                                  )
                                : null,
                            ),
                          )
                        }
                      >
                        <option value="">
                          Unassigned
                        </option>

                        {cabins.map(
                          (cabin) => (
                            <option
                              key={
                                cabin.id
                              }
                              value={
                                cabin.id
                              }
                            >
                              {
                                cabin.name
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <b>
                      {
                        item.selected_attendees
                      }{" "}
                      selected
                    </b>
                  </div>
                ),
              )
            ) : (
              <div className="admin-empty">
                No households registered
                yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
