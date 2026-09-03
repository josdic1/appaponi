import {
  useEffect,
  useMemo,
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
  MealMenuItem,
} from "@appoponi/shared/schemas/meals";

import type {
  AfterHoursItem,
  AfterHoursOrder,
} from "@appoponi/shared/schemas/afterHours";

import type {
  BabysittingRequest,
} from "@appoponi/shared/schemas/babysitting";

import type {
  NotificationPreferences,
  NotificationRecord,
} from "@appoponi/shared/schemas/notifications";

import {
  loadMemberHome,
} from "../api/member";

import {
  cancelAfterHoursOrder,
  cancelBabysittingRequest,
  createAfterHoursOrder,
  createBabysittingRequest,
  loadAfterHoursItems,
  loadAfterHoursOrders,
  loadBabysittingRequests,
  loadEventMeals,
  loadMealMenuItems,
  loadNotificationPreferences,
  loadNotifications,
  markNotificationRead,
  updateNotificationPreferences,
} from "../api/services";

import HumanDateTimeInput from "../components/HumanDateTimeInput";
import {
  humanDateTimeToIso,
} from "../lib/humanDateTime";

type View =
  | "meals"
  | "food"
  | "babysitting"
  | "notices";

export default function MemberServicesPanel() {
  const [view, setView] =
    useState<View>("meals");

  const [
    registrations,
    setRegistrations,
  ] = useState<EventRegistration[]>([]);

  const [household, setHousehold] =
    useState<HouseholdMember[]>([]);

  const [meals, setMeals] =
    useState<EventMeal[]>([]);

  const [menuItems, setMenuItems] =
    useState<MealMenuItem[]>([]);

  const [items, setItems] =
    useState<AfterHoursItem[]>([]);

  const [orders, setOrders] =
    useState<AfterHoursOrder[]>([]);

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

  const [
    selectedRegistrationId,
    setSelectedRegistrationId,
  ] = useState("");

  const [requesterId, setRequesterId] =
    useState("");

  const [foodItemId, setFoodItemId] =
    useState("");

  const [quantity, setQuantity] =
    useState("1");

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

  async function refresh() {
    const [
      home,
      nextMeals,
      nextMenuItems,
      nextItems,
      nextOrders,
      nextBabysitting,
      nextPreferences,
      nextNotifications,
    ] = await Promise.all([
      loadMemberHome(),
      loadEventMeals(),
      loadMealMenuItems(),
      loadAfterHoursItems(),
      loadAfterHoursOrders(),
      loadBabysittingRequests(),
      loadNotificationPreferences(),
      loadNotifications(),
    ]);

    setRegistrations(
      home.registrations,
    );

    setHousehold(
      home.household,
    );

    setMeals(nextMeals);
    setMenuItems(nextMenuItems);
    setItems(nextItems);
    setOrders(nextOrders);
    setBabysitting(
      nextBabysitting,
    );
    setPreferences(
      nextPreferences,
    );
    setNotifications(
      nextNotifications,
    );

    setSelectedRegistrationId(
      (current) =>
        current ||
        home.registrations[0]?.id ||
        "",
    );
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load services",
      ),
    );
  }, []);

  const registration =
    useMemo(
      () =>
        registrations.find(
          (item) =>
            item.id ===
            selectedRegistrationId,
        ) ?? null,
      [
        registrations,
        selectedRegistrationId,
      ],
    );

  const eventMeals =
    registration
      ? meals.filter(
          (meal) =>
            meal.event_id ===
            registration.event_id,
        )
      : [];

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
      await createAfterHoursOrder({
        event_registration_id:
          Number(registration.id),
        requested_by_member_id:
          requesterId
            ? Number(requesterId)
            : null,
        fulfillment,
        delivery_location:
          fulfillment ===
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
        <h2>Food & services</h2>

        {registrations.length >
          1 && (
          <select
            value={
              selectedRegistrationId
            }
            onChange={(e) =>
              setSelectedRegistrationId(
                e.target.value,
              )
            }
          >
            {registrations.map(
              (item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.event_name}
                </option>
              ),
            )}
          </select>
        )}
      </div>

      <div className="member-service-tabs">
        <button
          type="button"
          className={
            view === "meals"
              ? "active"
              : ""
          }
          onClick={() =>
            setView("meals")
          }
        >
          Meals
        </button>

        <button
          type="button"
          className={
            view === "food"
              ? "active"
              : ""
          }
          onClick={() =>
            setView("food")
          }
        >
          After-hours
        </button>

        <button
          type="button"
          className={
            view === "babysitting"
              ? "active"
              : ""
          }
          onClick={() =>
            setView("babysitting")
          }
        >
          Babysitting
        </button>

        <button
          type="button"
          className={
            view === "notices"
              ? "active"
              : ""
          }
          onClick={() =>
            setView("notices")
          }
        >
          Notices
        </button>
      </div>

      {error && (
        <div className="member-error">
          {error}
        </div>
      )}

      {view === "meals" && (
        <div className="member-card">
          <div className="member-card-head">
            <div>
              <strong>
                Meals
              </strong>
              <span>
                What is being served.
              </span>
            </div>
          </div>

          {eventMeals.length ? (
            eventMeals.map((meal) => {
              const itemsForMenu =
                meal.menu_id
                  ? menuItems.filter(
                      (item) =>
                        item.menu_id ===
                        meal.menu_id,
                    )
                  : [];

              return (
                <article
                  className="member-meal"
                  key={meal.id}
                >
                  <strong>
                    {meal.title ??
                      meal.meal_type_name}
                  </strong>

                  <span>
                    {new Date(
                      meal.starts_at,
                    ).toLocaleString(
                      [],
                      {
                        weekday:
                          "short",
                        hour:
                          "numeric",
                        minute:
                          "2-digit",
                      },
                    )}
                  </span>

                  {meal.menu_name && (
                    <b>
                      {meal.menu_name}
                    </b>
                  )}

                  {itemsForMenu.map(
                    (item) => (
                      <div
                        key={item.id}
                      >
                        {item.name}

                        {item.dietary_notes && (
                          <small>
                            {
                              item.dietary_notes
                            }
                          </small>
                        )}
                      </div>
                    ),
                  )}
                </article>
              );
            })
          ) : (
            <div className="member-empty">
              No meals scheduled yet.
            </div>
          )}
        </div>
      )}

      {view === "food" && (
        <>
          <section className="member-card">
            <div className="member-card-head">
              <div>
                <strong>
                  After-hours food
                </strong>

                <span>
                  Pickup or delivery.
                </span>
              </div>
            </div>

            <form
              className="member-service-form"
              onSubmit={submitFood}
            >
              <select
                value={foodItemId}
                onChange={(e) =>
                  setFoodItemId(
                    e.target.value,
                  )
                }
              >
                <option value="">
                  Choose item
                </option>

                {items.map(
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

              <select
                value={requesterId}
                onChange={(e) =>
                  setRequesterId(
                    e.target.value,
                  )
                }
              >
                <option value="">
                  Household
                </option>

                {household.map(
                  (person) => (
                    <option
                      key={person.id}
                      value={person.id}
                    >
                      {
                        person.full_name
                      }
                    </option>
                  ),
                )}
              </select>

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    e.target.value,
                  )
                }
              />

              <select
                value={fulfillment}
                onChange={(e) =>
                  setFulfillment(
                    e.target
                      .value as
                      | "pickup"
                      | "delivery",
                  )
                }
              >
                <option value="pickup">
                  Pickup
                </option>

                <option value="delivery">
                  Delivery
                </option>
              </select>

              {fulfillment ===
                "delivery" && (
                <input
                  placeholder="Delivery location"
                  value={
                    deliveryLocation
                  }
                  onChange={(e) =>
                    setDeliveryLocation(
                      e.target.value,
                    )
                  }
                />
              )}

              <button
                className="login-submit"
                type="submit"
              >
                Place order
              </button>
            </form>
          </section>

          <section className="member-card">
            <div className="member-card-head">
              <div>
                <strong>
                  Your orders
                </strong>
              </div>
            </div>

            {orders.length ? (
              orders.map(
                (order) => (
                  <div
                    className="member-service-row"
                    key={order.id}
                  >
                    <span>
                      <strong>
                        {
                          order.fulfillment
                        }
                      </strong>
                      <small>
                        {
                          order.event_name
                        }
                      </small>
                    </span>

                    <span className="member-service-actions">
                      <b>
                        {order.status}
                      </b>

                      {order.status ===
                        "open" && (
                        <button
                          type="button"
                          onClick={() =>
                            void run(() =>
                              cancelAfterHoursOrder(
                                order.id,
                              ),
                            )
                          }
                        >
                          Cancel
                        </button>
                      )}
                    </span>
                  </div>
                ),
              )
            ) : (
              <div className="member-empty">
                No orders yet.
              </div>
            )}
          </section>
        </>
      )}

      {view === "babysitting" && (
        <>
          <section className="member-card">
            <div className="member-card-head">
              <div>
                <strong>
                  Request babysitting
                </strong>
              </div>
            </div>

            <form
              className="member-service-form"
              onSubmit={
                submitBabysitting
              }
            >
              <div className="baby-member-grid">
                {household.map(
                  (person) => (
                    <button
                      type="button"
                      key={person.id}
                      className={
                        babysittingMembers.includes(
                          person.id,
                        )
                          ? "selected"
                          : ""
                      }
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
                  ),
                )}
              </div>

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

              <input
                placeholder="Notes"
                value={babyNotes}
                onChange={(e) =>
                  setBabyNotes(
                    e.target.value,
                  )
                }
              />

              <button
                className="login-submit"
                type="submit"
              >
                Request sitter
              </button>
            </form>
          </section>

          <section className="member-card">
            <div className="member-card-head">
              <div>
                <strong>
                  Requests
                </strong>
              </div>
            </div>

            {babysitting.length ? (
              babysitting.map(
                (request) => (
                  <div
                    className="member-service-row"
                    key={request.id}
                  >
                    <span>
                      <strong>
                        {request.member_names.join(
                          ", ",
                        )}
                      </strong>

                      <small>
                        {new Date(
                          request.starts_at,
                        ).toLocaleString()}
                      </small>
                    </span>

                    <span className="member-service-actions">
                      <b>
                        {request.status}
                      </b>

                      {[
                        "pending",
                        "confirmed",
                      ].includes(
                        request.status,
                      ) && (
                        <button
                          type="button"
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
                    </span>
                  </div>
                ),
              )
            ) : (
              <div className="member-empty">
                No babysitting requests.
              </div>
            )}
          </section>
        </>
      )}

      {view === "notices" && (
        <>
          {preferences && (
            <section className="member-card">
              <div className="member-card-head">
                <div>
                  <strong>
                    Notifications
                  </strong>
                  <span>
                    Choose what you want
                    reminders for.
                  </span>
                </div>
              </div>

              <div className="preference-list">
                {[
                  [
                    "activity_reminders",
                    "Activity reminders",
                  ],
                  [
                    "meal_reminders",
                    "Meal reminders",
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

          <section className="member-card">
            <div className="member-card-head">
              <div>
                <strong>
                  Notices
                </strong>
              </div>
            </div>

            {notifications.length ? (
              notifications.map(
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
              <div className="member-empty">
                No notices.
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
