import type {
  HouseholdMember,
} from "@appoponi/shared/schemas/householdMembers";

import type {
  ActivitySignup,
  EventRegistration,
  MemberAttendee,
} from "@appoponi/shared/schemas/registration";

import type {
  EventActivity,
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

export async function loadMemberHome() {
  const [
    registrationData,
    householdData,
    attendeeData,
    activityData,
    signupData,
  ] = await Promise.all([
    fetch(`${API_URL}/api/registrations`, {
      credentials: "include",
    }).then((r) =>
      json<{
        registrations: EventRegistration[];
      }>(r),
    ),

    fetch(`${API_URL}/api/member/household`, {
      credentials: "include",
    }).then((r) =>
      json<{
        household_members: HouseholdMember[];
      }>(r),
    ),

    fetch(`${API_URL}/api/member/attendees`, {
      credentials: "include",
    }).then((r) =>
      json<{
        attendees: MemberAttendee[];
      }>(r),
    ),

    fetch(`${API_URL}/api/member/activities`, {
      credentials: "include",
    }).then((r) =>
      json<{
        event_activities:
          Array<
            EventActivity & {
              signup_count: number;
            }
          >;
      }>(r),
    ),

    fetch(`${API_URL}/api/member/signups`, {
      credentials: "include",
    }).then((r) =>
      json<{
        signups: ActivitySignup[];
      }>(r),
    ),
  ]);

  return {
    registrations:
      registrationData.registrations,
    household:
      householdData.household_members,
    attendees:
      attendeeData.attendees,
    activities:
      activityData.event_activities,
    signups:
      signupData.signups,
  };
}

export async function addAttendee(
  member_id: number,
  event_id: number,
) {
  const response = await fetch(
    `${API_URL}/api/member/attendees`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        member_id,
        event_id,
      }),
    },
  );

  return json(response);
}

export async function removeAttendee(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/member/attendees/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}

export async function addSignup(
  event_activity_id: number,
  member_attendee_id: number,
) {
  const response = await fetch(
    `${API_URL}/api/member/signups`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_activity_id,
        member_attendee_id,
      }),
    },
  );

  return json(response);
}

export async function removeSignup(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/member/signups/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}
