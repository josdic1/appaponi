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

import type {
  NotificationPreferences,
  NotificationRecord,
} from "@appoponi/shared/schemas/notifications";

const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

async function json<T>(
  response: Response,
): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ?? "Request failed",
    );
  }

  return data as T;
}

/* Meals */

export async function loadMealTypes() {
  const response = await fetch(
    `${API_URL}/api/meals/types`,
    { credentials: "include" },
  );

  return (
    await json<{
      meal_types: MealType[];
    }>(response)
  ).meal_types;
}

export async function loadMealMenus() {
  const response = await fetch(
    `${API_URL}/api/meals/menus`,
    { credentials: "include" },
  );

  return (
    await json<{
      menus: MealMenu[];
    }>(response)
  ).menus;
}

export async function loadMealMenuItems() {
  const response = await fetch(
    `${API_URL}/api/meals/menu-items`,
    { credentials: "include" },
  );

  return (
    await json<{
      menu_items: MealMenuItem[];
    }>(response)
  ).menu_items;
}

export async function loadEventMeals() {
  const response = await fetch(
    `${API_URL}/api/meals/event-meals`,
    { credentials: "include" },
  );

  return (
    await json<{
      event_meals: EventMeal[];
    }>(response)
  ).event_meals;
}

export async function createMealMenu(
  input: {
    name: string;
    description?: string;
  },
) {
  const response = await fetch(
    `${API_URL}/api/meals/menus`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return json(response);
}

export async function createMealMenuItem(
  input: {
    menu_id: number;
    name: string;
    description?: string;
    dietary_notes?: string;
    sort_order?: number;
  },
) {
  const response = await fetch(
    `${API_URL}/api/meals/menu-items`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return json(response);
}

export async function createEventMeal(
  input: {
    event_id: number;
    meal_type_id: number;
    menu_id?: number | null;
    title?: string;
    notes?: string;
    starts_at: string;
    ends_at: string;
  },
) {
  const response = await fetch(
    `${API_URL}/api/meals/event-meals`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return json(response);
}

/* After hours */

export async function loadAfterHoursItems() {
  const response = await fetch(
    `${API_URL}/api/after-hours/items`,
    { credentials: "include" },
  );

  return (
    await json<{
      items: AfterHoursItem[];
    }>(response)
  ).items;
}

export async function loadAfterHoursOrders() {
  const response = await fetch(
    `${API_URL}/api/after-hours/orders`,
    { credentials: "include" },
  );

  return (
    await json<{
      orders: AfterHoursOrder[];
    }>(response)
  ).orders;
}

export async function createAfterHoursItem(
  input: {
    name: string;
    description?: string;
  },
) {
  const response = await fetch(
    `${API_URL}/api/after-hours/items`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return json(response);
}

export async function createAfterHoursOrder(
  input: {
    event_registration_id: number;
    requested_by_member_id?: number | null;
    fulfillment: "pickup" | "delivery";
    delivery_location?: string;
    notes?: string;
    items: Array<{
      item_id: number;
      quantity: number;
    }>;
  },
) {
  const response = await fetch(
    `${API_URL}/api/after-hours/orders`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return json(response);
}

export async function updateAfterHoursOrder(
  id: string,
  input: {
    assigned_staff_member_id?:
      | number
      | null;
    status?:
      | "open"
      | "fulfilled"
      | "cancelled";
  },
) {
  const response = await fetch(
    `${API_URL}/api/after-hours/orders/${id}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return json(response);
}

/* Babysitting */

export async function loadBabysittingRequests() {
  const response = await fetch(
    `${API_URL}/api/babysitting`,
    { credentials: "include" },
  );

  return (
    await json<{
      requests: BabysittingRequest[];
    }>(response)
  ).requests;
}

export async function createBabysittingRequest(
  input: {
    event_registration_id: number;
    starts_at: string;
    ends_at: string;
    notes?: string;
    member_ids: number[];
  },
) {
  const response = await fetch(
    `${API_URL}/api/babysitting`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return json(response);
}

export async function updateBabysittingRequest(
  id: string,
  input: {
    sitter_staff_member_id?:
      | number
      | null;
    status?:
      | "pending"
      | "confirmed"
      | "completed"
      | "cancelled";
  },
) {
  const response = await fetch(
    `${API_URL}/api/babysitting/${id}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return json(response);
}

/* Notifications */

export async function loadNotificationPreferences() {
  const response = await fetch(
    `${API_URL}/api/notifications/preferences`,
    { credentials: "include" },
  );

  return (
    await json<{
      preferences:
        NotificationPreferences;
    }>(response)
  ).preferences;
}

export async function updateNotificationPreferences(
  input: Partial<
    Omit<
      NotificationPreferences,
      "account_id"
    >
  >,
) {
  const response = await fetch(
    `${API_URL}/api/notifications/preferences`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return (
    await json<{
      preferences:
        NotificationPreferences;
    }>(response)
  ).preferences;
}

export async function loadNotifications() {
  const response = await fetch(
    `${API_URL}/api/notifications`,
    { credentials: "include" },
  );

  return (
    await json<{
      notifications:
        NotificationRecord[];
    }>(response)
  ).notifications;
}

export async function createNotification(
  input: {
    account_id: number;
    event_id?: number | null;
    kind:
      | "activity"
      | "meal"
      | "special"
      | "general";
    title: string;
    body: string;
    scheduled_for?: string | null;
  },
) {
  const response = await fetch(
    `${API_URL}/api/notifications`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return json(response);
}
