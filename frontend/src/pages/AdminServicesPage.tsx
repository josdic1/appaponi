import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import type { AccountRecord } from "@appoponi/shared/schemas/accounts";
import type { EventRecord } from "@appoponi/shared/schemas/events";
import type { StaffMember } from "@appoponi/shared/schemas/staffMembers";
import type { FoodOrder } from "@appoponi/shared/schemas/foodOrders";
import type { BabysittingRequest } from "@appoponi/shared/schemas/babysitting";

import { loadAccounts, loadStaffMembers } from "../api/admin";
import { loadEvents } from "../api/operations";
import {
  createEventNotificationBroadcast,
  createNotification,
  loadFoodOrders,
  loadBabysittingRequests,
  updateFoodOrder,
  updateBabysittingRequest,
} from "../api/services";
import HumanDateTimeInput from "../components/HumanDateTimeInput";
import { humanDateTimeToIso } from "../lib/humanDateTime";

type View = "orders" | "babysitting" | "notifications";

type Props = {
  activeEventId?: string;
};

export default function AdminServicesPage({ activeEventId = "" }: Props) {
  const [view, setView] = useState<View>("orders");
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [babysitting, setBabysitting] = useState<BabysittingRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [notificationAudience, setNotificationAudience] = useState<"event" | "account">("event");
  const [notificationAccountId, setNotificationAccountId] = useState("");
  const [notificationEventId, setNotificationEventId] = useState("");
  const [notificationKind, setNotificationKind] = useState<"activity" | "meal" | "special" | "general">("general");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [notificationSchedule, setNotificationSchedule] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");

  async function refresh() {
    const [nextAccounts, nextStaff, nextEvents, nextOrders, nextBabysitting] = await Promise.all([
      loadAccounts(),
      loadStaffMembers(),
      loadEvents(),
      loadFoodOrders(activeEventId || undefined),
      loadBabysittingRequests(activeEventId || undefined),
    ]);
    setAccounts(nextAccounts);
    setStaff(nextStaff);
    setEvents(nextEvents);
    setOrders(nextOrders);
    setBabysitting(nextBabysitting);
  }

  useEffect(() => {
    void refresh().catch((err) => setError(err instanceof Error ? err.message : "Could not load services"));
  }, [activeEventId]);

  useEffect(() => {
    if (activeEventId) setNotificationEventId(activeEventId);
  }, [activeEventId]);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  const activeEvent = events.find((event) => event.id === activeEventId) ?? null;
  const notificationEvent = events.find((event) => event.id === notificationEventId) ?? activeEvent;
  const visibleOrders = orders;
  const visibleBabysitting = babysitting;
  const babysittingStaff = staff.filter((person) => person.babysitting_eligible);

  function submitNotification(event: FormEvent) {
    event.preventDefault();

    if (notificationAudience === "event" && !notificationEventId) {
      setError("Choose an event.");
      return;
    }

    if (notificationAudience === "account" && !notificationAccountId) {
      setError("Choose a recipient.");
      return;
    }

    let scheduledFor: string | null = null;

    try {
      scheduledFor = notificationSchedule.trim()
        ? humanDateTimeToIso(
            notificationSchedule,
            notificationEvent?.starts_at,
          )
        : null;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Enter a valid send time",
      );
      return;
    }

    setNotificationMessage("");

    void run(async () => {
      if (notificationAudience === "event") {
        const result = await createEventNotificationBroadcast({
          event_id: Number(notificationEventId),
          kind: notificationKind,
          title: notificationTitle,
          body: notificationBody,
          scheduled_for: scheduledFor,
        });

        setNotificationMessage(
          scheduledFor
            ? `Scheduled for ${result.recipient_count} households.`
            : `Sent to ${result.recipient_count} households.`,
        );
      } else {
        await createNotification({
          account_id: Number(notificationAccountId),
          event_id: notificationEventId ? Number(notificationEventId) : null,
          kind: notificationKind,
          title: notificationTitle,
          body: notificationBody,
          scheduled_for: scheduledFor,
        });

        setNotificationMessage(
          scheduledFor ? "Notice scheduled." : "Notice sent.",
        );
      }

      setNotificationTitle("");
      setNotificationBody("");
      setNotificationSchedule("");
    });
  }

  return (
    <section>
      <div className="admin-heading">
        <div className="admin-eyebrow">ADMIN</div>
        <h1>Services</h1>
        <p>Manage guest requests and communication. Food planning lives in Meal planning.</p>
      </div>

      <div className="app-tabs" role="tablist" aria-label="Services">
        <button type="button" className={view === "orders" ? "active" : ""} onClick={() => setView("orders")}>Food requests</button>
        <button type="button" className={view === "babysitting" ? "active" : ""} onClick={() => setView("babysitting")}>Babysitting</button>
        <button type="button" className={view === "notifications" ? "active" : ""} onClick={() => setView("notifications")}>Notices</button>
      </div>

      {error && <div className="app-alert app-alert-danger">{error}</div>}

      {view === "orders" && (
        <section className="app-card service-focus-card">
          <div className="app-card-head">
            <div>
              <strong>Food requests</strong>
              <span>{activeEvent ? activeEvent.name : "All events"} · {visibleOrders.filter((order) => order.status === "open").length} open</span>
            </div>
          </div>

          <div className="service-record-list">
            {visibleOrders.length ? visibleOrders.map((order) => (
              <div className="service-record service-record-controls" key={order.id}>
                <div>
                  <strong>{order.username}{order.requested_by_name ? ` · ${order.requested_by_name}` : ""}</strong>
                  <span>{order.offering_type === "SNACK" ? "Snack" : "After-hours"} · {order.items.map((item) => `${item.quantity}× ${item.item_name}`).join(" · ")}</span>
                  <small>{order.fulfillment}{order.delivery_location ? ` · ${order.delivery_location}` : ""}</small>
                </div>

                <select
                  aria-label={`Assign ${order.username} order`}
                  value={order.assigned_staff_member_id ?? ""}
                  onChange={(event) => void run(() => updateFoodOrder(order.id, {
                    assigned_staff_member_id: event.target.value ? Number(event.target.value) : null,
                  }))}
                >
                  <option value="">Unassigned</option>
                  {staff.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
                </select>

                <select
                  aria-label={`Status for ${order.username} order`}
                  value={order.status}
                  onChange={(event) => void run(() => updateFoodOrder(order.id, {
                    status: event.target.value as "open" | "fulfilled" | "cancelled",
                  }))}
                >
                  <option value="open">Open</option>
                  <option value="fulfilled">Fulfilled</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )) : <div className="app-empty">No food requests.</div>}
          </div>
        </section>
      )}

      {view === "babysitting" && (
        <section className="app-card service-focus-card">
          <div className="app-card-head">
            <div>
              <strong>Babysitting requests</strong>
              <span>Assign eligible staff and confirm requests.</span>
            </div>
          </div>

          <div className="service-record-list">
            {visibleBabysitting.length ? visibleBabysitting.map((request) => (
              <div className="service-record service-record-controls" key={request.id}>
                <div>
                  <strong>{request.username} · {request.member_names.join(", ")}</strong>
                  <span>{new Date(request.starts_at).toLocaleString()} → {new Date(request.ends_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                </div>

                <select
                  value={request.sitter_staff_member_id ?? ""}
                  onChange={(event) => void run(() => updateBabysittingRequest(request.id, {
                    sitter_staff_member_id: event.target.value ? Number(event.target.value) : null,
                  }))}
                >
                  <option value="">No sitter</option>
                  {babysittingStaff.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
                </select>

                <select
                  value={request.status}
                  onChange={(event) => void run(() => updateBabysittingRequest(request.id, {
                    status: event.target.value as "pending" | "confirmed" | "completed" | "cancelled",
                  }))}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )) : <div className="app-empty">No babysitting requests.</div>}
          </div>
        </section>
      )}

      {view === "notifications" && (
        <section className="app-card service-focus-card">
          <div className="app-card-head">
            <div>
              <strong>Send notice</strong>
              <span>Send now or schedule it. Event notices go to every registered household.</span>
            </div>
          </div>

          {notificationMessage && (
            <div className="app-alert app-alert-success">{notificationMessage}</div>
          )}

          <form className="service-notification-form" onSubmit={submitNotification}>
            <select
              aria-label="Notice audience"
              value={notificationAudience}
              onChange={(event) => {
                setNotificationAudience(event.target.value as "event" | "account");
                setNotificationMessage("");
              }}
            >
              <option value="event">All registered households</option>
              <option value="account">One account</option>
            </select>

            {notificationAudience === "account" && (
              <select
                aria-label="Notice recipient"
                value={notificationAccountId}
                onChange={(event) => setNotificationAccountId(event.target.value)}
                required
              >
                <option value="">Recipient</option>
                {accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.display_name ?? item.username}
                  </option>
                ))}
              </select>
            )}

            <select
              aria-label="Notice event"
              value={notificationEventId}
              onChange={(event) => setNotificationEventId(event.target.value)}
              required={notificationAudience === "event"}
            >
              <option value="">
                {notificationAudience === "event" ? "Event" : "No event"}
              </option>
              {events.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>

            <select
              aria-label="Notice type"
              value={notificationKind}
              onChange={(event) => setNotificationKind(event.target.value as typeof notificationKind)}
            >
              <option value="general">General</option>
              <option value="activity">Activity</option>
              <option value="meal">Meal</option>
              <option value="special">Special</option>
            </select>

            <input
              placeholder="Title"
              value={notificationTitle}
              onChange={(event) => setNotificationTitle(event.target.value)}
              required
            />

            <textarea
              placeholder="Message"
              value={notificationBody}
              onChange={(event) => setNotificationBody(event.target.value)}
              required
            />

            <label>
              <span>Send later</span>
              <HumanDateTimeInput
                value={notificationSchedule}
                onChange={setNotificationSchedule}
                defaultDate={notificationEvent?.starts_at}
                placeholder="Leave blank for now"
              />
            </label>

            <button className="app-button app-button-primary" type="submit">
              {notificationSchedule.trim() ? "Schedule notice" : "Send notice"}
            </button>
          </form>
        </section>
      )}
    </section>
  );
}
