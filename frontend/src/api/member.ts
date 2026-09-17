import type {
  CreateOwnHouseholdMemberInput,
  HouseholdMember,
  MemberHouseholdSetupInput,
  UpdateOwnHouseholdInput,
} from "@appoponi/shared/schemas/householdMembers";

import type {
  ActivitySignup,
  EventRegistration,
  MemberAttendee,
  MemberDirectoryHousehold,
} from "@appoponi/shared/schemas/registration";

import type {
  EventActivity,
} from "@appoponi/shared/schemas/scheduling";

import type {
  EventMeal,
} from "@appoponi/shared/schemas/meals";

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
    mealData,
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

    fetch(`${API_URL}/api/meals/event-meals`, {
      credentials: "include",
    }).then((r) =>
      json<{
        event_meals: EventMeal[];
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
    meals:
      mealData.event_meals,
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

export async function updateEventHouseholdLead(
  event_id: number,
  member_id: number,
) {
  const response = await fetch(
    `${API_URL}/api/member/household-lead`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_id,
        member_id,
      }),
    },
  );

  return json<{
    household_lead_member_id: string;
    household_lead_name: string;
  }>(response);
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


export async function loadOwnHousehold():
  Promise<HouseholdMember[]> {
  const response = await fetch(
    `${API_URL}/api/member/household`,
    {
      credentials: "include",
    },
  );

  return (
    await json<{
      household_members:
        HouseholdMember[];
    }>(response)
  ).household_members;
}

export async function setupOwnHousehold(
  input: MemberHouseholdSetupInput,
) {
  const response = await fetch(
    `${API_URL}/api/member/household/setup`,
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
    household_member:
      HouseholdMember;
  }>(response);
}

export async function updateOwnHousehold(
  input: UpdateOwnHouseholdInput,
) {
  const response = await fetch(
    `${API_URL}/api/member/household`,
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

  return json<{
    household_name: string;
  }>(response);
}

export async function addOwnHouseholdMember(
  input: CreateOwnHouseholdMemberInput,
) {
  const response = await fetch(
    `${API_URL}/api/member/household`,
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
    household_member:
      HouseholdMember;
  }>(response);
}

export async function updateOwnHouseholdMember(
  id: string,
  input: {
    full_name?: string;
    email?: string | null;
    phone?: string | null;
    dietary_restrictions?:
      | string
      | null;
  },
) {
  const response = await fetch(
    `${API_URL}/api/member/household/${id}`,
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

  return json<{
    household_member:
      HouseholdMember;
  }>(response);
}


export async function makeOwnHouseholdPrimary(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/member/household/${id}/make-primary`,
    {
      method: "POST",
      credentials: "include",
    },
  );

  return json<{
    ok: true;
    primary_member_id: string;
  }>(response);
}

export async function deleteOwnHouseholdMember(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/member/household/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json<{
    ok: true;
  }>(response);
}

export async function loadMemberDirectory(
  eventId: string,
): Promise<MemberDirectoryHousehold[]> {
  const response = await fetch(
    `${API_URL}/api/member/directory?event_id=${encodeURIComponent(eventId)}`,
    {
      credentials: "include",
    },
  );

  return (
    await json<{
      households:
        MemberDirectoryHousehold[];
    }>(response)
  ).households;
}

export async function updateMemberDirectorySharing(
  eventId: string,
  shareCabinPublicly: boolean,
) {
  const response = await fetch(
    `${API_URL}/api/member/directory`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        event_id: Number(eventId),
        share_cabin_publicly:
          shareCabinPublicly,
      }),
    },
  );

  return json<{
    share_cabin_publicly: boolean;
  }>(response);
}
