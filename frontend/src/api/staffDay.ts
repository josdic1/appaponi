import type {
  StaffParticipant,
  StaffScheduledActivity,
} from "@appoponi/shared/schemas/staffDay";

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

export async function loadStaffDay() {
  const [activities, participants] =
    await Promise.all([
      fetch(
        `${API_URL}/api/staff-day/activities`,
        {
          credentials: "include",
        },
      ).then((r) =>
        json<{
          activities:
            StaffScheduledActivity[];
        }>(r),
      ),

      fetch(
        `${API_URL}/api/staff-day/participants`,
        {
          credentials: "include",
        },
      ).then((r) =>
        json<{
          participants:
            StaffParticipant[];
        }>(r),
      ),
    ]);

  return {
    activities:
      activities.activities,
    participants:
      participants.participants,
  };
}

async function post(
  path: string,
) {
  const response = await fetch(
    `${API_URL}/api/staff-day/${path}`,
    {
      method: "POST",
      credentials: "include",
    },
  );

  return json(response);
}

export const checkInParticipant = (
  signupId: string,
) =>
  post(
    `signups/${signupId}/check-in`,
  );

export const checkOutParticipant = (
  signupId: string,
) =>
  post(
    `signups/${signupId}/check-out`,
  );
