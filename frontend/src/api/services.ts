import type {
  EventMeal,
  FoodTag,
  MealItem,
  MealMenu,
  MealMenuItem,
  MealType,
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

export type MealMenuPreset = {
  key: string;
  name: string;
  description: string | null;
  item_count: number;
};

export async function loadMealMenuPresets() {
  const response = await fetch(
    `${API_URL}/api/meals/presets`,
    { credentials: "include" },
  );

  return (
    await json<{ presets: MealMenuPreset[] }>(response)
  ).presets;
}

export async function seedMealMenuPreset(
  key: string,
) {
  const response = await fetch(
    `${API_URL}/api/meals/presets/${encodeURIComponent(key)}`,
    {
      method: "POST",
      credentials: "include",
    },
  );

  return json<{
    key: string;
    menu_id: string;
    item_count: number;
    message: string;
  }>(response);
}

export async function loadMealItems() {
  const response = await fetch(
    `${API_URL}/api/meals/items`,
    { credentials: "include" },
  );

  return (
    await json<{
      items: MealItem[];
    }>(response)
  ).items;
}

export async function createMealItem(
  input: {
    name: string;
    description?: string;
    dietary_notes?: string;
    tags?: FoodTag[];
  },
) {
  const response = await fetch(
    `${API_URL}/api/meals/items`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return json<{ item: MealItem }>(response);
}

export async function updateMealItem(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    dietary_notes?: string | null;
    tags?: FoodTag[];
  },
) {
  const response = await fetch(
    `${API_URL}/api/meals/items/${id}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return json<{ item: MealItem }>(response);
}

export async function deleteMealItem(id: string) {
  const response = await fetch(
    `${API_URL}/api/meals/items/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
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

export async function loadMealMenuItems(menuId?: string) {
  const query = menuId
    ? `?menu_id=${encodeURIComponent(menuId)}`
    : "";

  const response = await fetch(
    `${API_URL}/api/meals/menu-items${query}`,
    { credentials: "include" },
  );

  return (
    await json<{
      menu_items: MealMenuItem[];
    }>(response)
  ).menu_items;
}

export async function loadEventMeals(eventId?: string) {
  const query = eventId
    ? `?event_id=${encodeURIComponent(eventId)}`
    : "";

  const response = await fetch(
    `${API_URL}/api/meals/event-meals${query}`,
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

  return json<{ menu: MealMenu }>(response);
}

export async function createMealMenuItem(
  input: {
    menu_id: number;
    item_id: number;
    meal_type_id?: number | null;
    day_of_week?: number | null;
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


export async function updateMealMenu(
  id: string,
  input: {
    name?: string;
    description?: string | null;
  },
) {
  const response = await fetch(
    `${API_URL}/api/meals/menus/${id}`,
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

export async function applyMealMenuToEvent(
  menuId: string,
  eventId: string,
) {
  const response = await fetch(
    `${API_URL}/api/meals/menus/${menuId}/apply-to-event`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        event_id: Number(eventId),
      }),
    },
  );

  return json<{
    ok: true;
    event_id: string;
    menu_id: string;
    scheduled_meals: number;
  }>(response);
}

export async function deleteMealMenu(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/meals/menus/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}

export async function updateMealMenuItem(
  id: string,
  input: {
    menu_id?: number;
    item_id?: number;
    meal_type_id?: number | null;
    day_of_week?: number | null;
    sort_order?: number;
  },
) {
  const response = await fetch(
    `${API_URL}/api/meals/menu-items/${id}`,
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

export async function deleteMealMenuItem(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/meals/menu-items/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}

export async function updateEventMeal(
  id: string,
  input: {
    event_id?: number;
    meal_type_id?: number;
    title?: string | null;
    notes?: string | null;
    starts_at?: string;
    ends_at?: string;
  },
) {
  const response = await fetch(
    `${API_URL}/api/meals/event-meals/${id}`,
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

export async function deleteEventMeal(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/meals/event-meals/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}

export async function addEventMealItem(
  eventMealId: string,
  itemId: string,
  sortOrder?: number,
) {
  const response = await fetch(
    `${API_URL}/api/meals/event-meals/${eventMealId}/items`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        item_id: Number(itemId),
        ...(sortOrder == null ? {} : { sort_order: sortOrder }),
      }),
    },
  );

  return json(response);
}

export async function removeFoodFromEventMeal(
  eventMealId: string,
  itemId: string,
) {
  const response = await fetch(
    `${API_URL}/api/meals/event-meals/${eventMealId}/items/${itemId}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}

export async function moveFoodInEventMeal(
  eventMealId: string,
  itemId: string,
  sortOrder: number,
) {
  const response = await fetch(
    `${API_URL}/api/meals/event-meals/${eventMealId}/items/${itemId}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sort_order: sortOrder }),
    },
  );

  return json(response);
}

export async function updateEventMealItem(
  id: string,
  sortOrder: number,
) {
  const response = await fetch(
    `${API_URL}/api/meals/event-meal-items/${id}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sort_order: sortOrder }),
    },
  );

  return json(response);
}

export async function deleteEventMealItem(id: string) {
  const response = await fetch(
    `${API_URL}/api/meals/event-meal-items/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}

export async function resetEventMealItems(eventMealId: string) {
  const response = await fetch(
    `${API_URL}/api/meals/event-meals/${eventMealId}/items`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}

/* Member-selectable food offerings */

export async function loadFoodOfferings(eventId?: string) {
  const query = eventId
    ? `?event_id=${encodeURIComponent(eventId)}`
    : "";

  const response = await fetch(
    `${API_URL}/api/food/items${query}`,
    { credentials: "include" },
  );

  return (
    await json<{
      items: FoodOffering[];
    }>(response)
  ).items;
}

export async function loadFoodOrders(eventId?: string) {
  const query = eventId
    ? `?event_id=${encodeURIComponent(eventId)}`
    : "";

  const response = await fetch(
    `${API_URL}/api/food/orders${query}`,
    { credentials: "include" },
  );

  return (
    await json<{
      orders: FoodOrder[];
    }>(response)
  ).orders;
}

export async function createFoodOffering(
  input: {
    event_id: number;
    item_id: number;
    offering_type: FoodOfferingType;
    sort_order?: number;
  },
) {
  const response = await fetch(
    `${API_URL}/api/food/items`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return json(response);
}

export async function createFoodOrder(
  input: {
    event_registration_id: number;
    requested_by_member_id?: number | null;
    offering_type: FoodOfferingType;
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
    `${API_URL}/api/food/orders`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return json(response);
}

export async function updateFoodOrder(
  id: string,
  input: {
    assigned_staff_member_id?: number | null;
    status?: "open" | "fulfilled" | "cancelled";
  },
) {
  const response = await fetch(
    `${API_URL}/api/food/orders/${id}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return json(response);
}

export async function updateFoodOffering(
  id: string,
  input: {
    available?: boolean;
    sort_order?: number;
  },
) {
  const response = await fetch(
    `${API_URL}/api/food/items/${id}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return json(response);
}

export async function deleteFoodOffering(id: string) {
  const response = await fetch(
    `${API_URL}/api/food/items/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}

export async function fulfillAssignedFoodOrder(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/food/orders/${id}/fulfill`,
    {
      method: "PATCH",
      credentials: "include",
    },
  );

  return json(response);
}

export async function cancelFoodOrder(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/food/orders/${id}/cancel`,
    {
      method: "PATCH",
      credentials: "include",
    },
  );

  return json(response);
}

/* Babysitting */

export async function loadBabysittingRequests(eventId?: string) {
  const query = eventId
    ? `?event_id=${encodeURIComponent(eventId)}`
    : "";

  const response = await fetch(
    `${API_URL}/api/babysitting${query}`,
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


export async function completeAssignedBabysitting(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/babysitting/${id}/complete`,
    {
      method: "PATCH",
      credentials: "include",
    },
  );

  return json(response);
}

export async function cancelBabysittingRequest(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/babysitting/${id}/cancel`,
    {
      method: "PATCH",
      credentials: "include",
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

export async function loadAdminNotificationHistory(
  accountId: string,
  eventId?: string,
) {
  const params =
    new URLSearchParams({
      account_id: accountId,
    });

  if (eventId) {
    params.set(
      "event_id",
      eventId,
    );
  }

  const response = await fetch(
    `${API_URL}/api/notifications/admin/history?${params.toString()}`,
    {
      credentials: "include",
    },
  );

  return (
    await json<{
      notifications:
        NotificationRecord[];
    }>(response)
  ).notifications;
}

export async function createEventNotificationBroadcast(
  input: {
    event_id: number;
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
    `${API_URL}/api/notifications/broadcast`,
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

  return json<{
    recipient_count: number;
  }>(response);
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


export async function markNotificationRead(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/notifications/${id}/read`,
    {
      method: "PATCH",
      credentials: "include",
    },
  );

  return (
    await json<{
      notification:
        NotificationRecord;
    }>(response)
  ).notification;
}
