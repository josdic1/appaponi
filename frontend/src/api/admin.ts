import type {
  AccountRecord,
  CreateAccountInput,
} from "@appoponi/shared/schemas/accounts";

import type {
  HouseholdMember,
  MemberRole,
} from "@appoponi/shared/schemas/householdMembers";

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

export async function loadAccounts() {
  const response = await fetch(
    `${API_URL}/api/accounts`,
    { credentials: "include" },
  );

  return (
    await json<{ accounts: AccountRecord[] }>(
      response,
    )
  ).accounts;
}

export async function createAccount(
  input: CreateAccountInput,
) {
  const response = await fetch(
    `${API_URL}/api/accounts`,
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
    await json<{ account: AccountRecord }>(
      response,
    )
  ).account;
}

export async function loadHouseholdMembers(
  accountId?: string,
) {
  const query = accountId
    ? `?account_id=${encodeURIComponent(accountId)}`
    : "";

  const response = await fetch(
    `${API_URL}/api/household-members${query}`,
    { credentials: "include" },
  );

  return (
    await json<{
      household_members: HouseholdMember[];
    }>(response)
  ).household_members;
}

export async function createHouseholdMember(
  input: {
    account_id: number;
    full_name: string;
    email?: string;
    phone?: string;
    dietary_restrictions?: string;
    member_role: MemberRole;
  },
) {
  const response = await fetch(
    `${API_URL}/api/household-members`,
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
    await json<{
      household_member: HouseholdMember;
    }>(response)
  ).household_member;
}

import type {
  StaffMember,
  StaffRole,
} from "@appoponi/shared/schemas/staffMembers";

export async function loadStaffMembers() {
  const response = await fetch(
    `${API_URL}/api/staff-members`,
    { credentials: "include" },
  );

  return (
    await json<{
      staff_members: StaffMember[];
    }>(response)
  ).staff_members;
}

export async function createStaffMember(
  input: {
    account_id: number;
    full_name: string;
    email?: string;
    phone?: string;
    role: StaffRole;
    babysitting_eligible: boolean;
  },
) {
  const response = await fetch(
    `${API_URL}/api/staff-members`,
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
    await json<{
      staff_member: StaffMember;
    }>(response)
  ).staff_member;
}

export async function updateStaffMember(
  id: string,
  input: {
    full_name?: string;
    email?: string | null;
    phone?: string | null;
    role?: StaffRole;
    babysitting_eligible?: boolean;
  },
) {
  const response = await fetch(
    `${API_URL}/api/staff-members/${id}`,
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
    await json<{
      staff_member: StaffMember;
    }>(response)
  ).staff_member;
}

export async function deleteStaffMember(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/staff-members/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}

import type {
  EventRegistration,
} from "@appoponi/shared/schemas/registration";

export async function loadRegistrations() {
  const response = await fetch(
    `${API_URL}/api/registrations`,
    { credentials: "include" },
  );

  return (
    await json<{
      registrations: EventRegistration[];
    }>(response)
  ).registrations;
}

export async function createRegistration(
  input: {
    account_id: number;
    event_id: number;
    spots_paid_for: number;
  },
) {
  const response = await fetch(
    `${API_URL}/api/registrations`,
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

export async function updateRegistrationSpots(
  id: string,
  spots_paid_for: number,
) {
  const response = await fetch(
    `${API_URL}/api/registrations/${id}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        spots_paid_for,
      }),
    },
  );

  return json(response);
}

import type {
  Cabin,
} from "@appoponi/shared/schemas/cabins";

import type {
  Area,
} from "@appoponi/shared/schemas/areas";

export async function loadCabins() {
  const response = await fetch(
    `${API_URL}/api/cabins`,
    { credentials: "include" },
  );

  return (
    await json<{
      cabins: Cabin[];
    }>(response)
  ).cabins;
}

export async function loadCabinAreas() {
  const response = await fetch(
    `${API_URL}/api/areas`,
    { credentials: "include" },
  );

  return (
    await json<{
      areas: Area[];
    }>(response)
  ).areas;
}

export async function createCabin(
  input: {
    name: string;
    area_id?: number | null;
    map_x?: number | null;
    map_y?: number | null;
  },
) {
  const response = await fetch(
    `${API_URL}/api/cabins`,
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

  return (
    await json<{
      cabin: Cabin;
    }>(response)
  ).cabin;
}

export async function updateCabin(
  id: string,
  input: {
    name?: string;
    area_id?: number | null;
    map_x?: number | null;
    map_y?: number | null;
  },
) {
  const response = await fetch(
    `${API_URL}/api/cabins/${id}`,
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
      cabin: Cabin;
    }>(response)
  ).cabin;
}

export async function deleteCabin(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/cabins/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}

export async function assignRegistrationCabin(
  registrationId: string,
  cabinId: number | null,
) {
  const response = await fetch(
    `${API_URL}/api/registrations/${registrationId}/cabin`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        cabin_id: cabinId,
      }),
    },
  );

  return json(response);
}

export async function updateAccount(
  id: string,
  username: string,
) {
  const response = await fetch(
    `${API_URL}/api/accounts/${id}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    },
  );

  return (
    await json<{ account: AccountRecord }>(
      response,
    )
  ).account;
}

export async function deleteAccount(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/accounts/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}

export async function resetAccountPassword(
  id: string,
  password: string,
) {
  const response = await fetch(
    `${API_URL}/api/accounts/${id}/reset-password`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
      }),
    },
  );

  return (
    await json<{ account: AccountRecord }>(
      response,
    )
  ).account;
}

export async function updateHouseholdMember(
  id: string,
  input: {
    full_name?: string;
    email?: string | null;
    phone?: string | null;
    dietary_restrictions?: string | null;
  },
) {
  const response = await fetch(
    `${API_URL}/api/household-members/${id}`,
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
    await json<{
      household_member: HouseholdMember;
    }>(response)
  ).household_member;
}

export async function transferHouseholdPrimary(
  currentPrimaryId: string,
  targetMemberId: string,
) {
  const response = await fetch(
    `${API_URL}/api/household-members/${currentPrimaryId}/transfer-primary`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target_member_id:
          Number(targetMemberId),
      }),
    },
  );

  return json(response);
}

export async function deleteHouseholdMember(
  id: string,
) {
  const response = await fetch(
    `${API_URL}/api/household-members/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return json(response);
}
