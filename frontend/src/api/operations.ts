import type {
  Area,
} from "@appoponi/shared/schemas/areas";

import type {
  Activity,
  ActivitySetting,
} from "@appoponi/shared/schemas/activities";

import type {
  EventRecord,
  EventType,
} from "@appoponi/shared/schemas/events";

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

export async function loadAreas() {
  const response = await fetch(
    `${API_URL}/api/areas`,
    { credentials: "include" },
  );

  return (
    await json<{ areas: Area[] }>(response)
  ).areas;
}

export async function createArea(
  name: string,
) {
  const response = await fetch(
    `${API_URL}/api/areas`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    },
  );

  return (
    await json<{ area: Area }>(response)
  ).area;
}

export async function updateArea(
  id: string,
  input: {
    name?: string;
    map_x?: number | null;
    map_y?: number | null;
  },
) {
  const response = await fetch(
    `${API_URL}/api/areas/${id}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return (
    await json<{ area: Area }>(response)
  ).area;
}

export async function deleteArea(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/areas/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}

export async function loadActivities() {
  const response = await fetch(
    `${API_URL}/api/activities`,
    { credentials: "include" },
  );

  return (
    await json<{ activities: Activity[] }>(
      response,
    )
  ).activities;
}

export async function createActivity(
  input: {
    name: string;
    area_id: number;
    setting: ActivitySetting;
  },
) {
  const response = await fetch(
    `${API_URL}/api/activities`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return (
    await json<{ activity: Activity }>(
      response,
    )
  ).activity;
}

export async function updateActivity(
  id: string,
  input: {
    name?: string;
    area_id?: number;
    setting?: ActivitySetting;
  },
) {
  const response = await fetch(
    `${API_URL}/api/activities/${id}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return (
    await json<{ activity: Activity }>(
      response,
    )
  ).activity;
}

export async function deleteActivity(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/activities/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}

export async function loadEventTypes() {
  const response = await fetch(
    `${API_URL}/api/event-types`,
    { credentials: "include" },
  );

  return (
    await json<{
      event_types: EventType[];
    }>(response)
  ).event_types;
}

export async function loadEvents() {
  const response = await fetch(
    `${API_URL}/api/events`,
    { credentials: "include" },
  );

  return (
    await json<{ events: EventRecord[] }>(
      response,
    )
  ).events;
}

export async function createEvent(
  input: {
    name: string;
    event_type_id: number;
    starts_at: string;
    ends_at: string;
    other_value?: string;
    other_reason?: string;
  },
) {
  const response = await fetch(
    `${API_URL}/api/events`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return (
    await json<{ event: EventRecord }>(
      response,
    )
  ).event;
}

export async function updateEvent(
  id: string,
  input: {
    name?: string;
    event_type_id?: number;
    starts_at?: string;
    ends_at?: string;
    other_value?: string;
    other_reason?: string;
  },
) {
  const response = await fetch(
    `${API_URL}/api/events/${id}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  return (
    await json<{ event: EventRecord }>(
      response,
    )
  ).event;
}

export async function deleteEvent(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/events/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}
