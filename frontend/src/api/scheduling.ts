import type {
  Qualification,
} from "@appoponi/shared/schemas/qualifications";

import type {
  ActivityQualification,
  EventActivity,
  EventActivityStaff,
  StaffArea,
  StaffQualification,
} from "@appoponi/shared/schemas/scheduling";

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

export async function loadQualifications() {
  const response = await fetch(
    `${API_URL}/api/qualifications`,
    { credentials: "include" },
  );

  return (
    await json<{
      qualifications: Qualification[];
    }>(response)
  ).qualifications;
}

export async function createQualification(
  name: string,
) {
  const response = await fetch(
    `${API_URL}/api/qualifications`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    },
  );

  return json(response);
}

export async function loadScheduling() {
  const [
    staffAreas,
    staffQualifications,
    activityQualifications,
    eventActivities,
    eventActivityStaff,
  ] = await Promise.all([
    fetch(`${API_URL}/api/scheduling/staff-areas`, {
      credentials: "include",
    }).then((r) =>
      json<{ staff_areas: StaffArea[] }>(r),
    ),
    fetch(`${API_URL}/api/scheduling/staff-qualifications`, {
      credentials: "include",
    }).then((r) =>
      json<{
        staff_qualifications: StaffQualification[];
      }>(r),
    ),
    fetch(`${API_URL}/api/scheduling/activity-qualifications`, {
      credentials: "include",
    }).then((r) =>
      json<{
        activity_qualifications: ActivityQualification[];
      }>(r),
    ),
    fetch(`${API_URL}/api/scheduling/event-activities`, {
      credentials: "include",
    }).then((r) =>
      json<{
        event_activities: EventActivity[];
      }>(r),
    ),
    fetch(`${API_URL}/api/scheduling/event-activity-staff`, {
      credentials: "include",
    }).then((r) =>
      json<{
        event_activity_staff: EventActivityStaff[];
      }>(r),
    ),
  ]);

  return {
    staffAreas: staffAreas.staff_areas,
    staffQualifications:
      staffQualifications.staff_qualifications,
    activityQualifications:
      activityQualifications.activity_qualifications,
    eventActivities:
      eventActivities.event_activities,
    eventActivityStaff:
      eventActivityStaff.event_activity_staff,
  };
}

async function post(
  path: string,
  body: unknown,
) {
  const response = await fetch(
    `${API_URL}/api/scheduling/${path}`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  return json(response);
}

async function remove(
  path: string,
) {
  const response = await fetch(
    `${API_URL}/api/scheduling/${path}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}

export const addStaffArea = (
  staff_member_id: number,
  area_id: number,
) =>
  post("staff-areas", {
    staff_member_id,
    area_id,
  });

export const addStaffQualification = (
  staff_member_id: number,
  qualification_id: number,
) =>
  post("staff-qualifications", {
    staff_member_id,
    qualification_id,
  });

export const addActivityQualification = (
  activity_id: number,
  qualification_id: number,
  required_staff_count: number,
) =>
  post("activity-qualifications", {
    activity_id,
    qualification_id,
    required_staff_count,
  });

export const addEventActivity = (
  input: {
    event_id: number;
    activity_id: number;
    starts_at: string;
    ends_at: string;
    capacity: number | null;
  },
) => post("event-activities", input);

export const assignEventActivityStaff = (
  event_activity_id: number,
  staff_member_id: number,
) =>
  post("event-activity-staff", {
    event_activity_id,
    staff_member_id,
  });

export async function removeQualification(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/qualifications/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}

export const removeStaffArea = (
  id: string,
) =>
  remove(`staff-areas/${id}`);

export const removeStaffQualification = (
  id: string,
) =>
  remove(`staff-qualifications/${id}`);

export const removeActivityQualification = (
  id: string,
) =>
  remove(`activity-qualifications/${id}`);

export const removeEventActivity = (
  id: string,
) =>
  remove(`event-activities/${id}`);

export const removeEventActivityStaff = (
  id: string,
) =>
  remove(`event-activity-staff/${id}`);
