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
  StaffMember,
} from "@appoponi/shared/schemas/staffMembers";

import type {
  EventMeal,
  MealMenu,
  MealMenuItem,
  MealType,
} from "@appoponi/shared/schemas/meals";

import type {
  AfterHoursItem,
  AfterHoursOrder,
} from "@appoponi/shared/schemas/afterHours";

import type {
  BabysittingRequest,
} from "@appoponi/shared/schemas/babysitting";

import {
  loadAccounts,
  loadStaffMembers,
} from "../api/admin";

import {
  loadEvents,
} from "../api/operations";

import {
  createAfterHoursItem,
  createEventMeal,
  createMealMenu,
  createMealMenuItem,
  createNotification,
  deleteAfterHoursItem,
  deleteEventMeal,
  deleteMealMenu,
  deleteMealMenuItem,
  loadAfterHoursItems,
  loadAfterHoursOrders,
  loadBabysittingRequests,
  loadEventMeals,
  loadMealMenuItems,
  loadMealMenus,
  loadMealTypes,
  updateAfterHoursItem,
  updateAfterHoursOrder,
  updateBabysittingRequest,
  updateEventMeal,
  updateMealMenu,
  updateMealMenuItem,
} from "../api/services";

import HumanDateTimeInput from "../components/HumanDateTimeInput";
import {
  humanDateTimeToIso,
} from "../lib/humanDateTime";

type View =
  | "meals"
  | "after-hours"
  | "babysitting"
  | "notifications";

function editableDateTime(
  value: string,
) {
  const date = new Date(value);

  let hour = date.getHours();
  const minute = String(
    date.getMinutes(),
  ).padStart(2, "0");
  const meridiem =
    hour >= 12 ? "PM" : "AM";

  hour %= 12;

  if (hour === 0) {
    hour = 12;
  }

  return `${
    date.getMonth() + 1
  }/${date.getDate()}/${date.getFullYear()} ${hour}:${minute} ${meridiem}`;
}

export default function AdminServicesPage() {
  const [view, setView] =
    useState<View>("meals");

  const [accounts, setAccounts] =
    useState<AccountRecord[]>([]);

  const [staff, setStaff] =
    useState<StaffMember[]>([]);

  const [events, setEvents] =
    useState<EventRecord[]>([]);

  const [mealTypes, setMealTypes] =
    useState<MealType[]>([]);

  const [menus, setMenus] =
    useState<MealMenu[]>([]);

  const [menuItems, setMenuItems] =
    useState<MealMenuItem[]>([]);

  const [eventMeals, setEventMeals] =
    useState<EventMeal[]>([]);

  const [afterItems, setAfterItems] =
    useState<AfterHoursItem[]>([]);

  const [orders, setOrders] =
    useState<AfterHoursOrder[]>([]);

  const [
    babysitting,
    setBabysitting,
  ] = useState<BabysittingRequest[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  const [menuName, setMenuName] =
    useState("");

  const [
    menuDescription,
    setMenuDescription,
  ] = useState("");

  const [
    editingMenuId,
    setEditingMenuId,
  ] = useState<string | null>(null);

  const [itemMenuId, setItemMenuId] =
    useState("");

  const [itemName, setItemName] =
    useState("");

  const [itemDietary, setItemDietary] =
    useState("");

  const [
    editingMenuItemId,
    setEditingMenuItemId,
  ] = useState<string | null>(null);

  const [mealEventId, setMealEventId] =
    useState("");

  const [mealTypeId, setMealTypeId] =
    useState("");

  const [mealMenuId, setMealMenuId] =
    useState("");

  const [mealTitle, setMealTitle] =
    useState("");

  const [mealStart, setMealStart] =
    useState("");

  const [mealEnd, setMealEnd] =
    useState("");

  const [
    editingMealId,
    setEditingMealId,
  ] = useState<string | null>(null);

  const [
    afterItemName,
    setAfterItemName,
  ] = useState("");

  const [
    afterItemDescription,
    setAfterItemDescription,
  ] = useState("");

  const [
    editingAfterItemId,
    setEditingAfterItemId,
  ] = useState<string | null>(null);

  const [
    notificationAccountId,
    setNotificationAccountId,
  ] = useState("");

  const [
    notificationEventId,
    setNotificationEventId,
  ] = useState("");

  const [
    notificationKind,
    setNotificationKind,
  ] =
    useState<
      | "activity"
      | "meal"
      | "special"
      | "general"
    >("general");

  const [
    notificationTitle,
    setNotificationTitle,
  ] = useState("");

  const [
    notificationBody,
    setNotificationBody,
  ] = useState("");

  async function refresh() {
    const [
      nextAccounts,
      nextStaff,
      nextEvents,
      nextTypes,
      nextMenus,
      nextMenuItems,
      nextEventMeals,
      nextAfterItems,
      nextOrders,
      nextBabysitting,
    ] = await Promise.all([
      loadAccounts(),
      loadStaffMembers(),
      loadEvents(),
      loadMealTypes(),
      loadMealMenus(),
      loadMealMenuItems(),
      loadEventMeals(),
      loadAfterHoursItems(),
      loadAfterHoursOrders(),
      loadBabysittingRequests(),
    ]);

    setAccounts(nextAccounts);
    setStaff(nextStaff);
    setEvents(nextEvents);
    setMealTypes(nextTypes);
    setMenus(nextMenus);
    setMenuItems(nextMenuItems);
    setEventMeals(nextEventMeals);
    setAfterItems(nextAfterItems);
    setOrders(nextOrders);
    setBabysitting(
      nextBabysitting,
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

  function confirmDelete(
    label: string,
    action: () => Promise<unknown>,
  ) {
    if (
      !window.confirm(
        `Delete ${label}?`,
      )
    ) {
      return;
    }

    void run(action);
  }

  function cancelMenuEdit() {
    setEditingMenuId(null);
    setMenuName("");
    setMenuDescription("");
  }

  function cancelMenuItemEdit() {
    setEditingMenuItemId(null);
    setItemMenuId("");
    setItemName("");
    setItemDietary("");
  }

  function cancelMealEdit() {
    setEditingMealId(null);
    setMealEventId("");
    setMealTypeId("");
    setMealMenuId("");
    setMealTitle("");
    setMealStart("");
    setMealEnd("");
  }

  function cancelAfterItemEdit() {
    setEditingAfterItemId(null);
    setAfterItemName("");
    setAfterItemDescription("");
  }

  function submitMenu(
    event: FormEvent,
  ) {
    event.preventDefault();

    void run(async () => {
      if (editingMenuId) {
        await updateMealMenu(
          editingMenuId,
          {
            name: menuName,
            description:
              menuDescription || null,
          },
        );
      } else {
        await createMealMenu({
          name: menuName,
          description:
            menuDescription || undefined,
        });
      }

      cancelMenuEdit();
    });
  }

  function submitMenuItem(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!itemMenuId) {
      setError("Choose a menu.");
      return;
    }

    void run(async () => {
      if (editingMenuItemId) {
        await updateMealMenuItem(
          editingMenuItemId,
          {
            menu_id:
              Number(itemMenuId),
            name: itemName,
            dietary_notes:
              itemDietary || null,
          },
        );
      } else {
        await createMealMenuItem({
          menu_id:
            Number(itemMenuId),
          name: itemName,
          dietary_notes:
            itemDietary || undefined,
        });
      }

      cancelMenuItemEdit();
    });
  }

  function submitMeal(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !mealEventId ||
      !mealTypeId ||
      !mealStart ||
      !mealEnd
    ) {
      setError(
        "Event, meal type, start, and end are required.",
      );
      return;
    }

    void run(async () => {
      const input = {
        event_id:
          Number(mealEventId),
        meal_type_id:
          Number(mealTypeId),
        menu_id: mealMenuId
          ? Number(mealMenuId)
          : null,
        starts_at:
          humanDateTimeToIso(
            mealStart,
            events.find(
              (item) =>
                item.id ===
                mealEventId,
            )?.starts_at,
          ),
        ends_at:
          humanDateTimeToIso(
            mealEnd,
            events.find(
              (item) =>
                item.id ===
                mealEventId,
            )?.starts_at,
          ),
      };

      if (editingMealId) {
        await updateEventMeal(
          editingMealId,
          {
            ...input,
            title:
              mealTitle || null,
          },
        );
      } else {
        await createEventMeal({
          ...input,
          title:
            mealTitle || undefined,
        });
      }

      cancelMealEdit();
    });
  }

  function submitAfterItem(
    event: FormEvent,
  ) {
    event.preventDefault();

    void run(async () => {
      if (editingAfterItemId) {
        await updateAfterHoursItem(
          editingAfterItemId,
          {
            name: afterItemName,
            description:
              afterItemDescription ||
              null,
          },
        );
      } else {
        await createAfterHoursItem({
          name: afterItemName,
          description:
            afterItemDescription ||
            undefined,
        });
      }

      cancelAfterItemEdit();
    });
  }

  function editMenu(
    menu: MealMenu,
  ) {
    setEditingMenuId(menu.id);
    setMenuName(menu.name);
    setMenuDescription(
      menu.description ?? "",
    );
  }

  function editMenuItem(
    item: MealMenuItem,
  ) {
    setEditingMenuItemId(item.id);
    setItemMenuId(item.menu_id);
    setItemName(item.name);
    setItemDietary(
      item.dietary_notes ?? "",
    );
  }

  function editMeal(
    meal: EventMeal,
  ) {
    setEditingMealId(meal.id);
    setMealEventId(meal.event_id);
    setMealTypeId(meal.meal_type_id);
    setMealMenuId(meal.menu_id ?? "");
    setMealTitle(meal.title ?? "");
    setMealStart(
      editableDateTime(
        meal.starts_at,
      ),
    );
    setMealEnd(
      editableDateTime(
        meal.ends_at,
      ),
    );
  }

  function editAfterItem(
    item: AfterHoursItem,
  ) {
    setEditingAfterItemId(item.id);
    setAfterItemName(item.name);
    setAfterItemDescription(
      item.description ?? "",
    );
  }

  function submitNotification(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!notificationAccountId) {
      setError(
        "Choose a recipient.",
      );
      return;
    }

    void run(async () => {
      await createNotification({
        account_id:
          Number(
            notificationAccountId,
          ),
        event_id:
          notificationEventId
            ? Number(
                notificationEventId,
              )
            : null,
        kind: notificationKind,
        title: notificationTitle,
        body: notificationBody,
      });

      setNotificationTitle("");
      setNotificationBody("");
    });
  }

  const babysittingStaff =
    staff.filter(
      (item) =>
        item.babysitting_eligible,
    );

  return (
    <section>
      <div className="admin-heading">
        <div className="admin-eyebrow">
          ADMIN
        </div>

        <h1>Services</h1>

        <p>
          Meals, after-hours food,
          babysitting, and guest
          notifications.
        </p>
      </div>

      <div className="operations-tabs">
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
            view === "after-hours"
              ? "active"
              : ""
          }
          onClick={() =>
            setView("after-hours")
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
            view === "notifications"
              ? "active"
              : ""
          }
          onClick={() =>
            setView(
              "notifications",
            )
          }
        >
          Notifications
        </button>
      </div>

      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      {view === "meals" && (
        <>
          <div className="schedule-grid">
            <section className="admin-card">
              <div className="admin-card-head">
                <div>
                  <strong>
                    {editingMenuId
                      ? "Edit menu"
                      : "Create menu"}
                  </strong>
                  <span>
                    Reusable meal menu.
                  </span>
                </div>
              </div>

              <form
                className="admin-form"
                onSubmit={submitMenu}
              >
                <input
                  placeholder="Menu name"
                  value={menuName}
                  onChange={(e) =>
                    setMenuName(
                      e.target.value,
                    )
                  }
                />

                <input
                  placeholder="Description"
                  value={
                    menuDescription
                  }
                  onChange={(e) =>
                    setMenuDescription(
                      e.target.value,
                    )
                  }
                />

                <div className="service-form-actions">
                  <button
                    className="admin-primary"
                    type="submit"
                  >
                    {editingMenuId
                      ? "Save menu"
                      : "Create menu"}
                  </button>

                  {editingMenuId && (
                    <button
                      className="admin-secondary-button"
                      type="button"
                      onClick={
                        cancelMenuEdit
                      }
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="admin-card">
              <div className="admin-card-head">
                <div>
                  <strong>
                    {editingMenuItemId
                      ? "Edit menu item"
                      : "Add menu item"}
                  </strong>
                  <span>
                    Food shown under a
                    reusable menu.
                  </span>
                </div>
              </div>

              <form
                className="admin-form"
                onSubmit={submitMenuItem}
              >
                <select
                  value={itemMenuId}
                  onChange={(e) =>
                    setItemMenuId(
                      e.target.value,
                    )
                  }
                >
                  <option value="">
                    Choose menu
                  </option>

                  {menus.map(
                    (menu) => (
                      <option
                        key={menu.id}
                        value={menu.id}
                      >
                        {menu.name}
                      </option>
                    ),
                  )}
                </select>

                <input
                  placeholder="Item name"
                  value={itemName}
                  onChange={(e) =>
                    setItemName(
                      e.target.value,
                    )
                  }
                />

                <input
                  placeholder="Dietary notes"
                  value={itemDietary}
                  onChange={(e) =>
                    setItemDietary(
                      e.target.value,
                    )
                  }
                />

                <div className="service-form-actions">
                  <button
                    className="admin-primary"
                    type="submit"
                  >
                    {editingMenuItemId
                      ? "Save item"
                      : "Add item"}
                  </button>

                  {editingMenuItemId && (
                    <button
                      className="admin-secondary-button"
                      type="button"
                      onClick={
                        cancelMenuItemEdit
                      }
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>
          </div>

          <section className="admin-card schedule-main-card">
            <div className="admin-card-head">
              <div>
                <strong>
                  {editingMealId
                    ? "Edit scheduled meal"
                    : "Schedule meal"}
                </strong>
                <span>
                  Put a meal onto an
                  event.
                </span>
              </div>
            </div>

            <form
              className="service-wide-form"
              onSubmit={submitMeal}
            >
              <select
                value={mealEventId}
                onChange={(e) =>
                  setMealEventId(
                    e.target.value,
                  )
                }
              >
                <option value="">
                  Event
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

              <select
                value={mealTypeId}
                onChange={(e) =>
                  setMealTypeId(
                    e.target.value,
                  )
                }
              >
                <option value="">
                  Meal type
                </option>

                {mealTypes.map(
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
                value={mealMenuId}
                onChange={(e) =>
                  setMealMenuId(
                    e.target.value,
                  )
                }
              >
                <option value="">
                  No menu
                </option>

                {menus.map(
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

              <input
                placeholder="Optional title"
                value={mealTitle}
                onChange={(e) =>
                  setMealTitle(
                    e.target.value,
                  )
                }
              />

              <HumanDateTimeInput
                value={mealStart}
                onChange={setMealStart}
                defaultDate={
                  events.find(
                    (item) =>
                      item.id ===
                      mealEventId,
                  )?.starts_at
                }
              />

              <HumanDateTimeInput
                value={mealEnd}
                onChange={setMealEnd}
                defaultDate={
                  events.find(
                    (item) =>
                      item.id ===
                      mealEventId,
                  )?.starts_at
                }
              />

              <div className="service-form-actions">
                <button
                  className="admin-primary"
                  type="submit"
                >
                  {editingMealId
                    ? "Save meal"
                    : "Schedule"}
                </button>

                {editingMealId && (
                  <button
                    className="admin-secondary-button"
                    type="button"
                    onClick={cancelMealEdit}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="service-record-list">
              {eventMeals.map(
                (meal) => (
                  <div
                    className="service-record"
                    key={meal.id}
                  >
                    <div>
                      <strong>
                        {meal.title ??
                          meal.meal_type_name}
                      </strong>

                      <span>
                        {
                          meal.event_name
                        }{" "}
                        ·{" "}
                        {meal.menu_name ??
                          "No menu"}
                      </span>
                    </div>

                    <small>
                      {new Date(
                        meal.starts_at,
                      ).toLocaleString()}
                    </small>

                    <div className="service-record-actions">
                      <button
                        className="admin-edit-button"
                        type="button"
                        onClick={() =>
                          editMeal(meal)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="admin-delete-button"
                        type="button"
                        onClick={() =>
                          confirmDelete(
                            `scheduled meal "${meal.title ?? meal.meal_type_name}"`,
                            () =>
                              deleteEventMeal(
                                meal.id,
                              ),
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>

          <section className="admin-card schedule-main-card">
            <div className="admin-card-head">
              <div>
                <strong>
                  Menu contents
                </strong>
                <span>
                  {menuItems.length} items
                </span>
              </div>
            </div>

            <div className="service-record-list">
              {menus.map((menu) => {
                const items =
                  menuItems.filter(
                    (item) =>
                      item.menu_id ===
                      menu.id,
                  );

                return (
                  <div
                    className="menu-summary"
                    key={menu.id}
                  >
                    <div className="menu-summary-head">
                      <strong>
                        {menu.name}
                      </strong>

                      <div className="service-record-actions">
                        <button
                          className="admin-edit-button"
                          type="button"
                          onClick={() =>
                            editMenu(menu)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="admin-delete-button"
                          type="button"
                          onClick={() =>
                            confirmDelete(
                              `menu "${menu.name}"`,
                              () =>
                                deleteMealMenu(
                                  menu.id,
                                ),
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {items.map(
                      (item) => (
                        <div
                          className="menu-item-row"
                          key={item.id}
                        >
                          <span>
                            {item.name}
                            {item.dietary_notes
                              ? ` · ${item.dietary_notes}`
                              : ""}
                          </span>

                          <div className="service-record-actions">
                            <button
                              className="admin-edit-button"
                              type="button"
                              onClick={() =>
                                editMenuItem(
                                  item,
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="admin-delete-button"
                              type="button"
                              onClick={() =>
                                confirmDelete(
                                  `menu item "${item.name}"`,
                                  () =>
                                    deleteMealMenuItem(
                                      item.id,
                                    ),
                                )
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {view === "after-hours" && (
        <>
          <div className="admin-grid">
            <section className="admin-card">
              <div className="admin-card-head">
                <div>
                  <strong>
                    {editingAfterItemId
                      ? "Edit food item"
                      : "Add food item"}
                  </strong>
                  <span>
                    Available for
                    after-hours ordering.
                  </span>
                </div>
              </div>

              <form
                className="admin-form"
                onSubmit={
                  submitAfterItem
                }
              >
                <input
                  placeholder="Item name"
                  value={
                    afterItemName
                  }
                  onChange={(e) =>
                    setAfterItemName(
                      e.target.value,
                    )
                  }
                />

                <input
                  placeholder="Description"
                  value={
                    afterItemDescription
                  }
                  onChange={(e) =>
                    setAfterItemDescription(
                      e.target.value,
                    )
                  }
                />

                <div className="service-form-actions">
                  <button
                    className="admin-primary"
                    type="submit"
                  >
                    {editingAfterItemId
                      ? "Save item"
                      : "Add item"}
                  </button>

                  {editingAfterItemId && (
                    <button
                      className="admin-secondary-button"
                      type="button"
                      onClick={
                        cancelAfterItemEdit
                      }
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="admin-card">
              <div className="admin-card-head">
                <div>
                  <strong>
                    Available items
                  </strong>
                  <span>
                    {afterItems.length} total
                  </span>
                </div>
              </div>

              <div className="compact-list">
                {afterItems.map(
                  (item) => (
                    <div
                      className="admin-inline-record"
                      key={item.id}
                    >
                      <span>
                        {item.name}
                        {!item.available
                          ? " · unavailable"
                          : ""}
                      </span>

                      <div className="service-record-actions">
                        <button
                          className="admin-edit-button"
                          type="button"
                          onClick={() =>
                            editAfterItem(
                              item,
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="admin-manage-button"
                          type="button"
                          onClick={() =>
                            void run(() =>
                              updateAfterHoursItem(
                                item.id,
                                {
                                  available:
                                    !item.available,
                                },
                              ),
                            )
                          }
                        >
                          {item.available
                            ? "Hide"
                            : "Make available"}
                        </button>

                        <button
                          className="admin-delete-button"
                          type="button"
                          onClick={() =>
                            confirmDelete(
                              `food item "${item.name}"`,
                              () =>
                                deleteAfterHoursItem(
                                  item.id,
                                ),
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>
          </div>

          <section className="admin-card schedule-main-card">
            <div className="admin-card-head">
              <div>
                <strong>
                  Orders
                </strong>
                <span>
                  Pickup and delivery
                  requests.
                </span>
              </div>
            </div>

            <div className="service-record-list">
              {orders.length ? (
                orders.map((order) => (
                  <div
                    className="service-record service-record-controls"
                    key={order.id}
                  >
                    <div>
                      <strong>
                        {
                          order.username
                        }{" "}
                        ·{" "}
                        {
                          order.fulfillment
                        }
                      </strong>

                      <span>
                        {
                          order.event_name
                        }
                        {order.delivery_location
                          ? ` · ${order.delivery_location}`
                          : ""}
                      </span>
                    </div>

                    <select
                      value={
                        order.assigned_staff_member_id ??
                        ""
                      }
                      onChange={(e) =>
                        void run(() =>
                          updateAfterHoursOrder(
                            order.id,
                            {
                              assigned_staff_member_id:
                                e
                                  .target
                                  .value
                                  ? Number(
                                      e
                                        .target
                                        .value,
                                    )
                                  : null,
                            },
                          ),
                        )
                      }
                    >
                      <option value="">
                        Unassigned
                      </option>

                      {staff.map(
                        (person) => (
                          <option
                            key={
                              person.id
                            }
                            value={
                              person.id
                            }
                          >
                            {
                              person.full_name
                            }
                          </option>
                        ),
                      )}
                    </select>

                    <select
                      value={
                        order.status
                      }
                      onChange={(e) =>
                        void run(() =>
                          updateAfterHoursOrder(
                            order.id,
                            {
                              status:
                                e
                                  .target
                                  .value as
                                  | "open"
                                  | "fulfilled"
                                  | "cancelled",
                            },
                          ),
                        )
                      }
                    >
                      <option value="open">
                        Open
                      </option>
                      <option value="fulfilled">
                        Fulfilled
                      </option>
                      <option value="cancelled">
                        Cancelled
                      </option>
                    </select>
                  </div>
                ))
              ) : (
                <div className="admin-empty">
                  No orders yet.
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {view === "babysitting" && (
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <strong>
                Babysitting requests
              </strong>

              <span>
                Assign eligible staff and
                confirm requests.
              </span>
            </div>
          </div>

          <div className="service-record-list">
            {babysitting.length ? (
              babysitting.map(
                (request) => (
                  <div
                    className="service-record service-record-controls"
                    key={request.id}
                  >
                    <div>
                      <strong>
                        {
                          request.username
                        }{" "}
                        ·{" "}
                        {request.member_names.join(
                          ", ",
                        )}
                      </strong>

                      <span>
                        {new Date(
                          request.starts_at,
                        ).toLocaleString()}
                        {" → "}
                        {new Date(
                          request.ends_at,
                        ).toLocaleTimeString()}
                      </span>
                    </div>

                    <select
                      value={
                        request.sitter_staff_member_id ??
                        ""
                      }
                      onChange={(e) =>
                        void run(() =>
                          updateBabysittingRequest(
                            request.id,
                            {
                              sitter_staff_member_id:
                                e
                                  .target
                                  .value
                                  ? Number(
                                      e
                                        .target
                                        .value,
                                    )
                                  : null,
                            },
                          ),
                        )
                      }
                    >
                      <option value="">
                        No sitter
                      </option>

                      {babysittingStaff.map(
                        (person) => (
                          <option
                            key={
                              person.id
                            }
                            value={
                              person.id
                            }
                          >
                            {
                              person.full_name
                            }
                          </option>
                        ),
                      )}
                    </select>

                    <select
                      value={
                        request.status
                      }
                      onChange={(e) =>
                        void run(() =>
                          updateBabysittingRequest(
                            request.id,
                            {
                              status:
                                e
                                  .target
                                  .value as
                                  | "pending"
                                  | "confirmed"
                                  | "completed"
                                  | "cancelled",
                            },
                          ),
                        )
                      }
                    >
                      <option value="pending">
                        Pending
                      </option>
                      <option value="confirmed">
                        Confirmed
                      </option>
                      <option value="completed">
                        Completed
                      </option>
                      <option value="cancelled">
                        Cancelled
                      </option>
                    </select>
                  </div>
                ),
              )
            ) : (
              <div className="admin-empty">
                No babysitting requests.
              </div>
            )}
          </div>
        </section>
      )}

      {view === "notifications" && (
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <strong>
                Send notification
              </strong>
              <span>
                Account-level guest
                message.
              </span>
            </div>
          </div>

          <form
            className="service-notification-form"
            onSubmit={
              submitNotification
            }
          >
            <select
              value={
                notificationAccountId
              }
              onChange={(e) =>
                setNotificationAccountId(
                  e.target.value,
                )
              }
            >
              <option value="">
                Recipient
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

            <select
              value={
                notificationEventId
              }
              onChange={(e) =>
                setNotificationEventId(
                  e.target.value,
                )
              }
            >
              <option value="">
                No event
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

            <select
              value={notificationKind}
              onChange={(e) =>
                setNotificationKind(
                  e.target.value as
                    | "activity"
                    | "meal"
                    | "special"
                    | "general",
                )
              }
            >
              <option value="general">
                General
              </option>
              <option value="activity">
                Activity
              </option>
              <option value="meal">
                Meal
              </option>
              <option value="special">
                Special
              </option>
            </select>

            <input
              placeholder="Title"
              value={notificationTitle}
              onChange={(e) =>
                setNotificationTitle(
                  e.target.value,
                )
              }
            />

            <textarea
              placeholder="Message"
              value={notificationBody}
              onChange={(e) =>
                setNotificationBody(
                  e.target.value,
                )
              }
            />

            <button
              className="admin-primary"
              type="submit"
            >
              Send notification
            </button>
          </form>
        </section>
      )}
    </section>
  );
}
