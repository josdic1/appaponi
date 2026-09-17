import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import type {
  HouseholdMember,
} from "@appoponi/shared/schemas/householdMembers";

import type {
  EventRegistration,
} from "@appoponi/shared/schemas/registration";

import type {
  EventMeal,
} from "@appoponi/shared/schemas/meals";

import type {
  FoodOffering,
  FoodOfferingType,
  FoodOrder,
} from "@appoponi/shared/schemas/foodOrders";

import type {
  BabysittingRequest,
} from "@appoponi/shared/schemas/babysitting";

import type {
  NotificationPreferences,
  NotificationRecord,
} from "@appoponi/shared/schemas/notifications";

import {
  cancelFoodOrder,
  cancelBabysittingRequest,
  createFoodOrder,
  createBabysittingRequest,
  loadFoodOfferings,
  loadFoodOrders,
  loadBabysittingRequests,
  loadEventMeals,
  loadNotificationPreferences,
  loadNotifications,
  markNotificationRead,
  updateNotificationPreferences,
} from "../api/services";

import HumanDateTimeInput from "../components/HumanDateTimeInput";
import { useAuth } from "../hooks/useAuth";
import {
  useOnlineStatus,
} from "../hooks/useOnlineStatus";
import {
  isOfflineFetchFailure,
  readOfflineCache,
  saveOfflineCache,
} from "../lib/offlineCache";
import {
  humanDateTimeToIso,
} from "../lib/humanDateTime";

type View =
  | "meals"
  | "snacks"
  | "after-hours"
  | "babysitting"
  | "notices";

function localDayKey(value: string) {
  const date = new Date(value);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

type MemberServicesData = {
  meals: EventMeal[];
  items: FoodOffering[];
  orders: FoodOrder[];
  babysitting: BabysittingRequest[];
  preferences: NotificationPreferences;
  notifications: NotificationRecord[];
};

type MealOpenRequest = {
  requestId: number;
  startsAt: string;
};

type Props = {
  activeEventId?: string;
  registration: EventRegistration | null;
  household: HouseholdMember[];
  mealOpenRequest?: MealOpenRequest | null;
};

export default function MemberServicesPanel({
  activeEventId = "",
  registration,
  household,
  mealOpenRequest = null,
}: Props) {
  const { account } = useAuth();
  const online = useOnlineStatus();

  const [
    usingCachedData,
    setUsingCachedData,
  ] = useState(false);
  const [view, setView] =
    useState<View>("meals");

  const [meals, setMeals] =
    useState<EventMeal[]>([]);

  const [items, setItems] =
    useState<FoodOffering[]>([]);

  const [orders, setOrders] =
    useState<FoodOrder[]>([]);

  const [
    babysitting,
    setBabysitting,
  ] = useState<BabysittingRequest[]>([]);

  const [
    preferences,
    setPreferences,
  ] =
    useState<NotificationPreferences | null>(
      null,
    );

  const [
    notifications,
    setNotifications,
  ] = useState<NotificationRecord[]>([]);

  const [requesterId, setRequesterId] =
    useState("");

  const [foodItemId, setFoodItemId] =
    useState("");

  const [showFoodOrder, setShowFoodOrder] =
    useState(false);

  const [quantity, setQuantity] =
    useState("1");

  const [mealDay, setMealDay] =
    useState("");

  const [
    fulfillment,
    setFulfillment,
  ] =
    useState<
      "pickup" | "delivery"
    >("pickup");

  const [
    deliveryLocation,
    setDeliveryLocation,
  ] = useState("");

  const [
    babysittingMembers,
    setBabysittingMembers,
  ] = useState<string[]>([]);

  const [babyStart, setBabyStart] =
    useState("");

  const [babyEnd, setBabyEnd] =
    useState("");

  const [babyNotes, setBabyNotes] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  function cacheKey() {
    return `member-services:${
      account?.username ??
      "unknown"
    }:${activeEventId || "none"}`;
  }

  function applyServices(
    data: MemberServicesData,
  ) {
    setMeals(data.meals);
    setItems(data.items);
    setOrders(data.orders);
    setBabysitting(
      data.babysitting,
    );
    setPreferences(
      data.preferences,
    );
    setNotifications(
      data.notifications,
    );
  }

  async function refresh() {
    try {
      const [
        nextMeals,
        nextItems,
        nextOrders,
        nextBabysitting,
        nextPreferences,
        nextNotifications,
      ] = await Promise.all([
        activeEventId ? loadEventMeals(activeEventId) : Promise.resolve([]),
        activeEventId ? loadFoodOfferings(activeEventId) : Promise.resolve([]),
        activeEventId ? loadFoodOrders(activeEventId) : Promise.resolve([]),
        activeEventId ? loadBabysittingRequests(activeEventId) : Promise.resolve([]),
        loadNotificationPreferences(),
        loadNotifications(),
      ]);

      const data: MemberServicesData =
        {
          meals: nextMeals,
          items: nextItems,
          orders: nextOrders,
          babysitting:
            nextBabysitting,
          preferences:
            nextPreferences,
          notifications:
            nextNotifications,
        };

      applyServices(data);

      saveOfflineCache(
        cacheKey(),
        data,
      );

      setUsingCachedData(false);
      setError(null);
    } catch (err) {
      const cached =
        readOfflineCache<MemberServicesData>(
          cacheKey(),
        );

      if (
        isOfflineFetchFailure(
          err,
        ) &&
        cached
      ) {
        applyServices(
          cached.value,
        );

        setUsingCachedData(true);
        setError(null);
        return;
      }

      throw err;
    }
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load services",
      ),
    );
  }, [activeEventId]);

  useEffect(() => {
    if (
      online &&
      usingCachedData
    ) {
      void refresh().catch(
        (err) =>
          setError(
            err instanceof Error
              ? err.message
              : "Could not refresh services",
          ),
      );
    }
  }, [
    online,
    usingCachedData,
  ]);

  useEffect(() => {
    setRequesterId("");
    setFoodItemId("");
    setShowFoodOrder(false);
    setQuantity("1");
    setFulfillment("pickup");
    setDeliveryLocation("");
    setBabysittingMembers([]);
    setBabyStart("");
    setBabyEnd("");
    setBabyNotes("");
    setMealDay("");
  }, [activeEventId]);

  useEffect(() => {
    if (view !== "snacks" && view !== "after-hours") return;
    setFoodItemId("");
    setQuantity("1");
    setDeliveryLocation("");
    if (view === "snacks") setFulfillment("pickup");
  }, [view]);

  const eventMeals = registration ? meals : [];

  const selectedOfferingType: FoodOfferingType =
    view === "snacks" ? "SNACK" : "AFTER_HOURS";

  const eventFoodOfferings =
    registration
      ? items.filter(
          (item) =>
            item.offering_type === selectedOfferingType &&
            item.available,
        )
      : [];

  const eventFoodOrders = registration
    ? orders.filter(
        (order) => order.offering_type === selectedOfferingType,
      )
    : [];

  const eventBabysitting = registration ? babysitting : [];

  const eventNotifications = registration
    ? notifications.filter((notice) =>
        notice.event_id === null || notice.event_id === registration.event_id,
      )
    : notifications.filter((notice) => notice.event_id === null);

  const selectedFoodOffering =
    eventFoodOfferings.find((item) => item.item_id === foodItemId) ?? null;

  const mealDays = Array.from(
    new Map(
      eventMeals.map((meal) => {
        const date = new Date(meal.starts_at);
        return [localDayKey(meal.starts_at), date] as const;
      }),
    ).entries(),
  ).sort((a, b) => a[1].getTime() - b[1].getTime());

  const selectedMealDay =
    mealDays.some(([key]) => key === mealDay)
      ? mealDay
      : mealDays[0]?.[0] ?? "";

  const visibleMeals = eventMeals
    .filter((meal) => {
      return localDayKey(meal.starts_at) === selectedMealDay;
    })
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() -
        new Date(b.starts_at).getTime(),
    );

  useEffect(() => {
    if (!mealDays.length) {
      setMealDay("");
      return;
    }

    const today = localDayKey(new Date().toISOString());

    setMealDay((current) => {
      if (mealDays.some(([key]) => key === current)) {
        return current;
      }

      if (mealDays.some(([key]) => key === today)) {
        return today;
      }

      return mealDays[0][0];
    });
  }, [registration?.event_id, eventMeals.length]);

  useEffect(() => {
    if (!mealOpenRequest) {
      return;
    }

    setView("meals");
    setMealDay(localDayKey(mealOpenRequest.startsAt));
  }, [mealOpenRequest]);

  const changesUnavailable =
    !online ||
    usingCachedData;

  async function run(
    action: () => Promise<unknown>,
  ) {
    setError(null);

    if (changesUnavailable) {
      setError(
        "Reconnect to make changes.",
      );
      return;
    }

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

  function submitFood(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !registration ||
      !foodItemId
    ) {
      setError(
        "Choose an event and food item.",
      );
      return;
    }

    void run(async () => {
      await createFoodOrder({
        event_registration_id:
          Number(registration.id),
        requested_by_member_id:
          requesterId
            ? Number(requesterId)
            : null,
        offering_type: selectedOfferingType,
        fulfillment: selectedOfferingType === "SNACK" ? "pickup" : fulfillment,
        delivery_location:
          selectedOfferingType === "AFTER_HOURS" && fulfillment ===
            "delivery"
            ? deliveryLocation
            : undefined,
        items: [
          {
            item_id:
              Number(foodItemId),
            quantity:
              Number(quantity),
          },
        ],
      });

      setFoodItemId("");
      setQuantity("1");
      setDeliveryLocation("");
      setShowFoodOrder(false);
    });
  }

  function toggleBabyMember(
    id: string,
  ) {
    setBabysittingMembers(
      (current) =>
        current.includes(id)
          ? current.filter(
              (item) =>
                item !== id,
            )
          : [...current, id],
    );
  }

  function submitBabysitting(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !registration ||
      !babyStart ||
      !babyEnd ||
      !babysittingMembers.length
    ) {
      setError(
        "Choose people, start, and end.",
      );
      return;
    }

    void run(async () => {
      await createBabysittingRequest({
        event_registration_id:
          Number(registration.id),
        starts_at:
          humanDateTimeToIso(
            babyStart,
          ),
        ends_at:
          humanDateTimeToIso(
            babyEnd,
            babyStart,
          ),
        notes:
          babyNotes || undefined,
        member_ids:
          babysittingMembers.map(
            Number,
          ),
      });

      setBabysittingMembers([]);
      setBabyStart("");
      setBabyEnd("");
      setBabyNotes("");
    });
  }

  async function changePreference(
    key:
      | "activity_reminders"
      | "meal_reminders"
      | "special_notifications"
      | "general_notifications",
    value: boolean,
  ) {
    if (changesUnavailable) {
      setError(
        "Reconnect to make changes.",
      );
      return;
    }

    try {
      const next =
        await updateNotificationPreferences(
          {
            [key]: value,
          },
        );

      setPreferences(next);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save preferences",
      );
    }
  }

  return (
    <section className="member-services">
      <div className="member-services-title">
        <div>
          <h2>Food & services</h2>
          {registration && <span>{registration.event_name}</span>}
        </div>
      </div>

      <div className="app-tabs" role="tablist" aria-label="Food and services">
        <button type="button" className={view === "meals" ? "active" : ""} onClick={() => setView("meals")}>Meals</button>
        <button type="button" className={view === "snacks" ? "active" : ""} onClick={() => setView("snacks")}>Snacks</button>
        <button type="button" className={view === "after-hours" ? "active" : ""} onClick={() => setView("after-hours")}>After-hours</button>
        <button type="button" className={view === "babysitting" ? "active" : ""} onClick={() => setView("babysitting")}>Babysitting</button>
        <button type="button" className={view === "notices" ? "active" : ""} onClick={() => setView("notices")}>Notices</button>
      </div>

      {(!online ||
        usingCachedData) && (
        <div className="app-alert app-alert-warning">
          Offline · showing the last
          saved food, services, and
          notices. Changes are
          unavailable.
        </div>
      )}

      {error && (
        <div className="app-alert app-alert-danger app-alert-sticky" role="alert">
          {error}
        </div>
      )}

      {view === "meals" && (
        <section className="app-card member-card member-meals-day-view">
          <div className="app-card-head member-meals-head">
            <div>
              <strong>Meals</strong>
              <span>What is being served, one day at a time.</span>
            </div>
          </div>

          {mealDays.length > 0 && (
            <div className="member-meal-day-filter app-day-rail" aria-label="Meal day">
              {mealDays.map(([key, date]) => {
                const today = localDayKey(new Date().toISOString());
                return (
                  <button
                    key={key}
                    type="button"
                    className={selectedMealDay === key ? "active" : ""}
                    onClick={() => setMealDay(key)}
                  >
                    <span>{date.toLocaleDateString([], { weekday: "short" })}</span>
                    <strong>{date.getDate()}</strong>
                    {key === today && <small>Today</small>}
                  </button>
                );
              })}
            </div>
          )}

          {visibleMeals.length ? (
            <div className="member-meal-timeline">
              {visibleMeals.map((meal) => (
                <article className="member-meal-service" key={meal.id}>
                  <time>
                    {new Date(meal.starts_at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                  <div>
                    <strong>{meal.title ?? meal.meal_type_name}</strong>
                    {meal.items.length ? (
                      <p>{meal.items.map((item) => item.name).join(" · ")}</p>
                    ) : (
                      <p>Menu not set yet.</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="app-empty">No meals scheduled for this day.</div>
          )}
        </section>
      )}

      {(view === "snacks" || view === "after-hours") && (
        <section className="app-card member-card member-food-workspace">
          <div className="app-card-head">
            <div>
              <strong>{selectedOfferingType === "SNACK" ? "Snacks" : "After-hours food"}</strong>
              <span>{selectedOfferingType === "SNACK" ? "Tap an available snack to request pickup." : "Tap an available item to order pickup or delivery."}</span>
            </div>
          </div>

          <div className="member-food-catalog">
            {eventFoodOfferings.length ? (
              eventFoodOfferings.map((item) => (
                <button
                  type="button"
                  className={`member-food-item${showFoodOrder && foodItemId === item.item_id ? " selected" : ""}`}
                  key={item.id}
                  onClick={() => {
                    setFoodItemId(item.item_id);
                    setShowFoodOrder(true);
                  }}
                >
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.description ?? (selectedOfferingType === "SNACK" ? "Pickup" : "After-hours")}</small>
                  </span>
                  <b>Choose</b>
                </button>
              ))
            ) : (
              <div className="app-empty">
                {selectedOfferingType === "SNACK" ? "No snacks are currently offered." : "No after-hours items are currently offered."}
              </div>
            )}
          </div>

          {showFoodOrder && selectedFoodOffering && (
            <form
              className="member-service-form member-food-order-form"
              onSubmit={submitFood}
            >
              <div className="member-food-order-selection">
                <span>Selected</span>
                <strong>{selectedFoodOffering.name}</strong>
                <button
                  type="button"
                  className="app-button"
                  onClick={() => {
                    setShowFoodOrder(false);
                    setFoodItemId("");
                  }}
                >
                  Change
                </button>
              </div>

              <label>
                <span>For</span>
                <select value={requesterId} onChange={(e) => setRequesterId(e.target.value)}>
                  <option value="">Household</option>
                  {household.map((person) => (
                    <option key={person.id} value={person.id}>{person.full_name}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Quantity</span>
                <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </label>

              {selectedOfferingType === "AFTER_HOURS" && (
                <label>
                  <span>How</span>
                  <select value={fulfillment} onChange={(e) => setFulfillment(e.target.value as "pickup" | "delivery")}>
                    <option value="pickup">Pickup</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </label>
              )}

              {selectedOfferingType === "AFTER_HOURS" && fulfillment === "delivery" && (
                <label className="member-food-delivery-field">
                  <span>Delivery location</span>
                  <input value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} />
                </label>
              )}

              <div className="member-food-order-actions">
                <button
                  className="app-button"
                  type="button"
                  onClick={() => {
                    setShowFoodOrder(false);
                    setFoodItemId("");
                  }}
                >
                  Cancel
                </button>
                <button className="app-button app-button-primary" type="submit" disabled={changesUnavailable}>
                  {selectedOfferingType === "SNACK" ? "Request pickup" : "Place order"}
                </button>
              </div>
            </form>
          )}

          {eventFoodOrders.length > 0 && (
            <div className="member-food-orders">
              <div className="member-subhead">Your requests</div>
              {eventFoodOrders.map((order) => (
                <div className="member-service-row" key={order.id}>
                  <span>
                    <strong>
                      {order.items
                        .map((item) => `${item.quantity}× ${item.item_name}`)
                        .join(" · ")}
                    </strong>
                    <small>
                      {order.fulfillment}
                      {order.delivery_location
                        ? ` · ${order.delivery_location}`
                        : ""}
                    </small>
                  </span>

                  <span className="member-service-actions">
                    <b>{order.status}</b>
                    {order.status === "open" && (
                      <button
                        className="app-button"
                        type="button"
                        disabled={changesUnavailable}
                        onClick={() =>
                          void run(() => cancelFoodOrder(order.id))
                        }
                      >
                        Cancel
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {view === "babysitting" && (
        <>
          <section className="app-card member-card">
            <div className="app-card-head">
              <div>
                <strong>
                  Request babysitting
                </strong>
              </div>
            </div>

            <form
              className="member-service-form member-babysitting-form"
              onSubmit={
                submitBabysitting
              }
            >
              <fieldset className="app-choice-field app-form-span">
                <legend>Who needs a sitter?</legend>

                <div className="app-choice-grid">
                  {household.map(
                    (person) => {
                      const selected =
                        babysittingMembers.includes(
                          person.id,
                        );

                      return (
                        <button
                          type="button"
                          key={person.id}
                          className={`app-button app-choice-button ${selected ? "selected" : ""}`}
                          aria-pressed={selected}
                          onClick={() =>
                            toggleBabyMember(
                              person.id,
                            )
                          }
                        >
                          {
                            person.full_name
                          }
                        </button>
                      );
                    },
                  )}
                </div>
              </fieldset>

              <label>
                <span>Starts</span>

                <HumanDateTimeInput
                  value={babyStart}
                  onChange={setBabyStart}
                />
              </label>

              <label>
                <span>Ends</span>

                <HumanDateTimeInput
                  value={babyEnd}
                  onChange={setBabyEnd}
                  defaultDate={babyStart}
                />
              </label>

              <label className="app-form-span">
                <span>Notes</span>

                <textarea
                  rows={2}
                  placeholder="Anything the sitter should know"
                  value={babyNotes}
                  onChange={(e) =>
                    setBabyNotes(
                      e.target.value,
                    )
                  }
                />
              </label>

              <div className="service-form-actions app-form-span">
                <button
                  className="app-button app-button-primary"
                  type="submit"
                  disabled={
                    changesUnavailable
                  }
                >
                  Request sitter
                </button>
              </div>
            </form>
          </section>

          <section className="app-card member-card">
            <div className="app-card-head">
              <div>
                <strong>
                  Requests
                </strong>
              </div>
            </div>

            {eventBabysitting.length ? (
              eventBabysitting.map(
                (request) => (
                  <div
                    className="app-record-row"
                    key={request.id}
                  >
                    <div className="app-record-copy">
                      <strong>
                        {request.member_names.join(
                          ", ",
                        )}
                      </strong>

                      <span>
                        {new Date(
                          request.starts_at,
                        ).toLocaleString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {" – "}
                        {new Date(
                          request.ends_at,
                        ).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="app-record-actions">
                      <span className="app-status-pill">
                        {request.status}
                      </span>

                      {[
                        "pending",
                        "confirmed",
                      ].includes(
                        request.status,
                      ) && (
                        <button
                          className="app-button"
                          type="button"
                          disabled={
                            changesUnavailable
                          }
                          onClick={() =>
                            void run(() =>
                              cancelBabysittingRequest(
                                request.id,
                              ),
                            )
                          }
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ),
              )
            ) : (
              <div className="app-empty">
                No babysitting requests.
              </div>
            )}
          </section>
        </>
      )}

      {view === "notices" && (
        <>
          {preferences && (
            <section className="app-card member-card">
              <div className="app-card-head">
                <div>
                  <strong>
                    Notifications
                  </strong>
                  <span>
                    Automatic reminders arrive 30 minutes before activities and meals. Camp notices follow the categories you keep on.
                  </span>
                </div>
              </div>

              <div className="preference-list">
                {[
                  [
                    "activity_reminders",
                    "Activity reminders · 30 min before",
                  ],
                  [
                    "meal_reminders",
                    "Meal reminders · 30 min before",
                  ],
                  [
                    "special_notifications",
                    "Special notices",
                  ],
                  [
                    "general_notifications",
                    "General notices",
                  ],
                ].map(
                  ([key, label]) => (
                    <label key={key}>
                      <span>
                        {label}
                      </span>

                      <input
                        type="checkbox"
                        disabled={
                          changesUnavailable
                        }
                        checked={
                          preferences[
                            key as keyof Omit<
                              NotificationPreferences,
                              "account_id"
                            >
                          ] as boolean
                        }
                        onChange={(e) =>
                          void changePreference(
                            key as
                              | "activity_reminders"
                              | "meal_reminders"
                              | "special_notifications"
                              | "general_notifications",
                            e.target
                              .checked,
                          )
                        }
                      />
                    </label>
                  ),
                )}
              </div>
            </section>
          )}

          <section className="app-card member-card">
            <div className="app-card-head">
              <div>
                <strong>
                  Notices
                </strong>
              </div>
            </div>

            {eventNotifications.length ? (
              eventNotifications.map(
                (notice) => (
                  <article
                    className={
                      notice.read_at
                        ? "member-notice"
                        : "member-notice unread"
                    }
                    key={notice.id}
                  >
                    <strong>
                      {notice.title}
                    </strong>

                    <span>
                      {notice.body}
                    </span>

                    <div className="member-notice-foot">
                      <small>
                        {new Date(
                          notice.created_at,
                        ).toLocaleString()}
                      </small>

                      {!notice.read_at && (
                        <button
                          type="button"
                          disabled={
                            changesUnavailable
                          }
                          onClick={() =>
                            void run(() =>
                              markNotificationRead(
                                notice.id,
                              ),
                            )
                          }
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </article>
                ),
              )
            ) : (
              <div className="app-empty">
                No notices.
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
