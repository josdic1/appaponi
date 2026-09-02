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
