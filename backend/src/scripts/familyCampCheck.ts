import assert from "node:assert/strict";

const API =
  process.env.APPONI_API_URL ??
  "http://localhost:3001";

const adminUsername =
  process.env.APPONI_ADMIN_USERNAME;

const adminPassword =
  process.env.APPONI_ADMIN_PASSWORD;

if (!adminUsername || !adminPassword) {
  throw new Error(
    "APPONI_ADMIN_USERNAME and APPONI_ADMIN_PASSWORD are required",
  );
}

type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

function newYorkDateKey(
  value: string | Date,
) {
  const parts =
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(
      value instanceof Date
        ? value
        : new Date(value),
    );

  const part = (type: string) =>
    parts.find(
      (item) => item.type === type,
    )?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

type ApiResult = {
  status: number;
  body: any;
};

class Session {
  private cookie = "";

  async request(
    method: string,
    path: string,
    body?: unknown,
    expected?: number | number[],
  ): Promise<ApiResult> {
    const headers: Record<string, string> = {};

    if (this.cookie) {
      headers.Cookie = this.cookie;
    }

    if (body !== undefined) {
      headers["Content-Type"] =
        "application/json";
    }

    const response = await fetch(
      `${API}${path}`,
      {
        method,
        headers,
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
      },
    );

    const getSetCookie = (
      response.headers as any
    ).getSetCookie?.bind(
      response.headers,
    );

    const setCookies:
      string[] =
      getSetCookie?.() ?? [];

    const setCookie =
      setCookies[0] ??
      response.headers.get(
        "set-cookie",
      );

    if (setCookie) {
      this.cookie =
        setCookie.split(";")[0];
    }

    const text =
      await response.text();

    let parsed: any = null;

    if (text) {
      try {
        parsed =
          JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    const acceptable =
      expected === undefined
        ? response.status >= 200 &&
          response.status < 300
        : Array.isArray(expected)
          ? expected.includes(
              response.status,
            )
          : response.status ===
            expected;

    if (!acceptable) {
      throw new Error(
        `${method} ${path} → ${response.status}\n${JSON.stringify(
          parsed,
          null,
          2,
        )}`,
      );
    }

    return {
      status: response.status,
      body: parsed,
    };
  }

  login(
    username: string,
    password: string,
  ) {
    return this.request(
      "POST",
      "/api/auth/login",
      {
        username,
        password,
      },
    );
  }
}

function idFrom(
  body: any,
  preferredKey?: string,
): string {
  if (
    preferredKey &&
    body?.[preferredKey]?.id
  ) {
    return String(
      body[preferredKey].id,
    );
  }

  if (body?.id) {
    return String(body.id);
  }

  if (
    body &&
    typeof body === "object"
  ) {
    for (
      const value of
      Object.values(body)
    ) {
      if (
        value &&
        typeof value ===
          "object" &&
        !Array.isArray(value) &&
        (value as any).id
      ) {
        return String(
          (value as any).id,
        );
      }
    }
  }

  throw new Error(
    `Could not find created id in:\n${JSON.stringify(
      body,
      null,
      2,
    )}`,
  );
}

function arrayFrom(
  body: any,
  key: string,
): any[] {
  const value = body?.[key];

  if (!Array.isArray(value)) {
    throw new Error(
      `Expected ${key} array:\n${JSON.stringify(
        body,
        null,
        2,
      )}`,
    );
  }

  return value;
}

function pass(label: string) {
  console.log(`PASS  ${label}`);
}

const stamp =
  new Date()
    .toISOString()
    .replace(/\D/g, "")
    .slice(0, 14);

const memberUsername =
  `reg-member-${stamp}`;

const staffUsername =
  `reg-staff-${stamp}`;

const directoryUsername =
  `reg-directory-${stamp}`;

const tempPassword =
  `temp-${stamp}`;

const resetMemberPassword =
  `reset-${stamp}`;

const memberPassword =
  `member-${stamp}`;

const staffPassword =
  `staff-${stamp}`;

const directoryPassword =
  `directory-${stamp}`;

const day = 24 * 60 * 60 * 1000;

const eventStartDate =
  new Date(
    Date.now() + 14 * day,
  );

eventStartDate.setUTCHours(
  12,
  0,
  0,
  0,
);

const eventStart =
  eventStartDate.toISOString();

const eventEnd =
  new Date(
    eventStartDate.getTime() +
      2 * day,
  ).toISOString();

const activityStart =
  new Date(
    eventStartDate.getTime() +
      3 * 60 * 60 * 1000,
  ).toISOString();

const activityEnd =
  new Date(
    eventStartDate.getTime() +
      4 * 60 * 60 * 1000,
  ).toISOString();

const mealStart =
  new Date(
    eventStartDate.getTime() +
      5 * 60 * 60 * 1000,
  ).toISOString();

const mealEnd =
  new Date(
    eventStartDate.getTime() +
      6 * 60 * 60 * 1000,
  ).toISOString();

const babysittingStart =
  new Date(
    eventStartDate.getTime() +
      7 * 60 * 60 * 1000,
  ).toISOString();

const babysittingEnd =
  new Date(
    eventStartDate.getTime() +
      8 * 60 * 60 * 1000,
  ).toISOString();

async function main() {
  const health =
    await fetch(`${API}/api/health`);

  assert.equal(
    health.ok,
    true,
    `Backend is not running at ${API}`,
  );

  pass("backend health");

  const blockedOrigin =
    await fetch(
      `${API}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Origin:
            "https://not-appoponi.example",
        },
        body: JSON.stringify({
          username:
            adminUsername,
          password:
            adminPassword,
        }),
      },
    );

  assert.equal(
    blockedOrigin.status,
    403,
  );

  pass("cross-site mutation blocked");

  /* ADMIN */

  const admin =
    new Session();

  await admin.login(
    adminUsername!,
    adminPassword!,
  );

  const adminMe =
    await admin.request(
      "GET",
      "/api/auth/me",
    );

  assert.equal(
    adminMe.body.account
      .account_type,
    "admin",
  );

  pass("admin authentication");

  /* EVENT TYPE */

  const eventTypes =
    arrayFrom(
      (
        await admin.request(
          "GET",
          "/api/event-types",
        )
      ).body,
      "event_types",
    );

  const familyCamp =
    eventTypes.find(
      (item) =>
        item.name ===
        "Family Camp",
    );

  assert.ok(
    familyCamp,
    "Family Camp event type is missing",
  );

  const familyCampTypeId =
    String(familyCamp.id);

  pass("Family Camp event type");

  /* ACCOUNTS */

  const memberAccountResult =
    await admin.request(
      "POST",
      "/api/accounts",
      {
        username:
          memberUsername,
        password:
          tempPassword,
        account_type:
          "member",
      },
    );

  const memberAccountId =
    idFrom(
      memberAccountResult.body,
      "account",
    );

  const staffAccountResult =
    await admin.request(
      "POST",
      "/api/accounts",
      {
        username:
          staffUsername,
        password:
          tempPassword,
        account_type:
          "staff",
      },
    );

  const staffAccountId =
    idFrom(
      staffAccountResult.body,
      "account",
    );

  pass("member + staff accounts");

  await admin.request(
    "POST",
    `/api/accounts/${memberAccountId}/reset-password`,
    {
      password:
        resetMemberPassword,
    },
  );

  const oldMemberPassword =
    new Session();

  await oldMemberPassword.request(
    "POST",
    "/api/auth/login",
    {
      username:
        memberUsername,
      password:
        tempPassword,
    },
    401,
  );

  const resetMember =
    new Session();

  const resetLogin =
    await resetMember.login(
      memberUsername,
      resetMemberPassword,
    );

  assert.equal(
    resetLogin.body.account
      .must_change_password,
    true,
  );

  pass("admin password reset");

  /* HOUSEHOLD */

  const primaryResult =
    await admin.request(
      "POST",
      "/api/household-members",
      {
        account_id:
          Number(
            memberAccountId,
          ),
        full_name:
          "Test Parent",
        member_role:
          "primary",
      },
    );

  const primaryId =
    idFrom(
      primaryResult.body,
      "household_member",
    );

  const adultResult =
    await admin.request(
      "POST",
      "/api/household-members",
      {
        account_id:
          Number(
            memberAccountId,
          ),
        full_name:
          "Test Parent Two",
        member_role:
          "adult",
      },
    );

  const adultId =
    idFrom(
      adultResult.body,
      "household_member",
    );

  const childOneResult =
    await admin.request(
      "POST",
      "/api/household-members",
      {
        account_id:
          Number(
            memberAccountId,
          ),
        full_name:
          "Test Child One",
        member_role:
          "child",
      },
    );

  const childOneId =
    idFrom(
      childOneResult.body,
      "household_member",
    );

  const childTwoResult =
    await admin.request(
      "POST",
      "/api/household-members",
      {
        account_id:
          Number(
            memberAccountId,
          ),
        full_name:
          "Test Child Two",
        member_role:
          "child",
      },
    );

  const childTwoId =
    idFrom(
      childTwoResult.body,
      "household_member",
    );

  pass(
    "household default lead + adult + children",
  );

  /* STAFF PROFILE */

  const staffProfileResult =
    await admin.request(
      "POST",
      "/api/staff-members",
      {
        account_id:
          Number(
            staffAccountId,
          ),
        full_name:
          "Test Staff",
        role: "staff",
        babysitting_eligible:
          true,
      },
    );

  const staffMemberId =
    idFrom(
      staffProfileResult.body,
      "staff_member",
    );

  pass("staff profile");

  /* AREA */

  const areaResult =
    await admin.request(
      "POST",
      "/api/areas",
      {
        name:
          `Test Waterfront ${stamp}`,
      },
    );

  const areaId =
    idFrom(
      areaResult.body,
      "area",
    );

  /* ACTIVITY */

  const activityResult =
    await admin.request(
      "POST",
      "/api/activities",
      {
        name:
          `Test Canoeing ${stamp}`,
        area_id:
          Number(areaId),
        setting:
          "outside",
        map_place_id:
          "waterfront",
      },
    );

  const activityId =
    idFrom(
      activityResult.body,
      "activity",
    );

  assert.equal(
    activityResult.body?.activity?.map_place_id,
    "waterfront",
  );

  pass("area + activity + stable map place");

  /* STAFF AREA */

  await admin.request(
    "POST",
    "/api/scheduling/staff-areas",
    {
      staff_member_id:
        Number(
          staffMemberId,
        ),
      area_id:
        Number(areaId),
    },
  );

  pass("staff area assignment");

  /* EVENT */

  const eventResult =
    await admin.request(
      "POST",
      "/api/events",
      {
        name:
          `Test Family Camp ${stamp}`,
        event_type_id:
          Number(
            familyCampTypeId,
          ),
        starts_at:
          eventStart,
        ends_at:
          eventEnd,
      },
    );

  const eventId =
    idFrom(
      eventResult.body,
      "event",
    );

  await admin.request(
    "POST",
    "/api/events",
    {
      name:
        `Test Family Camp ${stamp}`,
      event_type_id:
        Number(
          familyCampTypeId,
        ),
      starts_at:
        eventStart,
      ends_at:
        eventEnd,
    },
    409,
  );

  pass("Family Camp event + exact duplicate blocked");

  /* SCHEDULE ACTIVITY */

  const eventActivityResult =
    await admin.request(
      "POST",
      "/api/scheduling/event-activities",
      {
        event_id:
          Number(eventId),
        activity_id:
          Number(activityId),
        starts_at:
          activityStart,
        ends_at:
          activityEnd,
        capacity: 1,
      },
    );

  const eventActivityId =
    idFrom(
      eventActivityResult.body,
      "event_activity",
    );

  await admin.request(
    "POST",
    "/api/scheduling/event-activity-staff",
    {
      event_activity_id:
        Number(
          eventActivityId,
        ),
      staff_member_id:
        Number(
          staffMemberId,
        ),
    },
  );

  pass(
    "activity schedule + staff assignment",
  );

  /* REGISTRATION */

  const registrationResult =
    await admin.request(
      "POST",
      "/api/registrations",
      {
        account_id:
          Number(
            memberAccountId,
          ),
        event_id:
          Number(eventId),
        spots_paid_for: 3,
      },
    );

  const registrationId =
    idFrom(
      registrationResult.body,
      "registration",
    );

  pass("event registration");

  /* CABIN */

  const cabinResult =
    await admin.request(
      "POST",
      "/api/cabins",
      {
        name:
          `Test Cabin ${stamp}`,
        area_id:
          Number(areaId),
      },
    );

  const cabinId =
    idFrom(
      cabinResult.body,
      "cabin",
    );

  const renamedCabin =
    `Test Cabin ${stamp} Updated`;

  await admin.request(
    "PATCH",
    `/api/cabins/${cabinId}`,
    {
      name: renamedCabin,
    },
  );

  const cabins =
    arrayFrom(
      (
        await admin.request(
          "GET",
          "/api/cabins",
        )
      ).body,
      "cabins",
    );

  assert.ok(
    cabins.some(
      (item) =>
        String(item.id) ===
          cabinId &&
        item.name ===
          renamedCabin &&
        item.map_slot_id ===
          null,
    ),
  );


  await admin.request(
    "PATCH",
    `/api/registrations/${registrationId}/cabin`,
    {
      cabin_id:
        Number(cabinId),
    },
  );

  const moveTargetCabinResult =
    await admin.request(
      "POST",
      "/api/cabins",
      {
        name: `Move Target Cabin ${stamp}`,
        area_id: Number(areaId),
      },
    );

  const moveTargetCabinId =
    idFrom(
      moveTargetCabinResult.body,
      "cabin",
    );

  await admin.request(
    "PATCH",
    `/api/registrations/${registrationId}/cabin`,
    {
      cabin_id: Number(moveTargetCabinId),
    },
  );

  const movedRegistration =
    arrayFrom(
      (
        await admin.request(
          "GET",
          "/api/registrations",
        )
      ).body,
      "registrations",
    ).find(
      (item) => String(item.id) === registrationId,
    );

  assert.equal(
    String(movedRegistration?.cabin_id),
    moveTargetCabinId,
  );

  pass(
    "household moves from assigned cabin to empty cabin",
  );

  await admin.request(
    "PATCH",
    `/api/registrations/${registrationId}/cabin`,
    {
      cabin_id: Number(cabinId),
    },
  );

  pass(
    "cabin create + update + assignment",
  );

  /* MEALS */

  const menuResult =
    await admin.request(
      "POST",
      "/api/meals/menus",
      {
        name:
          `Test Camp Dinner ${stamp}`,
        description:
          "Test dinner menu",
      },
    );

  const menuId =
    idFrom(
      menuResult.body,
      "menu",
    );

  const mealItemResult =
    await admin.request(
      "POST",
      "/api/meals/items",
      {
        name:
          `Test Grilled Chicken ${stamp}`,
        dietary_notes:
          "Gluten free",
        tags: [
          "ENTREE",
          "GLUTEN_FREE",
        ],
      },
    );

  assert.deepEqual(
    [...(mealItemResult.body.item.tags ?? [])].sort(),
    [
      "ENTREE",
      "GLUTEN_FREE",
    ],
  );

  const mealItemId =
    idFrom(
      mealItemResult.body,
      "item",
    );

  const updatedTaggedItem =
    await admin.request(
      "PATCH",
      `/api/meals/items/${mealItemId}`,
      {
        tags: [
          "ENTREE",
        ],
      },
    );

  assert.deepEqual(
    updatedTaggedItem.body.item.tags,
    [
      "ENTREE",
    ],
  );

  pass("structured food tags");

  await admin.request(
    "POST",
    "/api/meals/menu-items",
    {
      menu_id:
        Number(menuId),
      item_id:
        Number(mealItemId),
      sort_order: 1,
    },
  );

  const mealTypes =
    arrayFrom(
      (
        await admin.request(
          "GET",
          "/api/meals/types",
        )
      ).body,
      "meal_types",
    );

  const dinner =
    mealTypes.find(
      (item) =>
        item.name === "Dinner",
    );

  assert.ok(
    dinner,
    "Dinner meal type missing",
  );

  await admin.request(
    "POST",
    `/api/meals/menus/${menuId}/apply-to-event`,
    {
      event_id: Number(eventId),
    },
  );

  const eventMealResult =
    await admin.request(
      "POST",
      "/api/meals/event-meals",
      {
        event_id:
          Number(eventId),
        meal_type_id:
          Number(dinner.id),
        title:
          "Test Camp Dinner",
        starts_at:
          mealStart,
        ends_at:
          mealEnd,
      },
    );

  const eventMealId =
    idFrom(
      eventMealResult.body,
      "event_meal",
    );

  const readyFoodHq = (
    await admin.request(
      "GET",
      `/api/events/${eventId}/hq`,
    )
  ).body.hq;

  assert.equal(
    readyFoodHq?.metrics?.food_services_unready,
    0,
  );

  pass("menu + scheduled meal");

  const serviceExtraResult =
    await admin.request(
      "POST",
      "/api/meals/items",
      {
        name: `Test Brownie ${stamp}`,
        tags: [
          "DESSERT",
        ],
      },
    );

  const serviceExtraItemId =
    idFrom(serviceExtraResult.body, "item");

  await admin.request(
    "POST",
    `/api/meals/event-meals/${eventMealId}/items`,
    {
      item_id: Number(serviceExtraItemId),
    },
  );

  const customizedMeals = arrayFrom(
    (await admin.request("GET", "/api/meals/event-meals")).body,
    "event_meals",
  );

  const customizedMeal = customizedMeals.find(
    (item) => String(item.id) === String(eventMealId),
  );

  assert.equal(customizedMeal?.composition_mode, "CUSTOM");
  assert.ok(
    customizedMeal?.items?.some(
      (item: any) => String(item.item_id) === String(serviceExtraItemId),
    ),
  );

  const customizedItemIds = (customizedMeal?.items ?? []).map(
    (item: any) => String(item.item_id),
  );

  for (const itemId of customizedItemIds) {
    await admin.request(
      "DELETE",
      `/api/meals/event-meals/${eventMealId}/items/${itemId}`,
    );
  }

  const emptyCustomMeals = arrayFrom(
    (await admin.request("GET", "/api/meals/event-meals")).body,
    "event_meals",
  );

  const emptyCustomMeal = emptyCustomMeals.find(
    (item) => String(item.id) === String(eventMealId),
  );

  assert.equal(emptyCustomMeal?.composition_mode, "CUSTOM");
  assert.deepEqual(emptyCustomMeal?.items ?? [], []);

  const emptyCustomHq = (
    await admin.request(
      "GET",
      `/api/events/${eventId}/hq`,
    )
  ).body.hq;

  assert.equal(
    emptyCustomHq?.metrics?.food_services_unready,
    1,
  );

  await admin.request(
    "DELETE",
    `/api/meals/event-meals/${eventMealId}/items`,
  );

  const resetMeals = arrayFrom(
    (await admin.request("GET", "/api/meals/event-meals")).body,
    "event_meals",
  );

  const resetMeal = resetMeals.find(
    (item) => String(item.id) === String(eventMealId),
  );

  assert.equal(resetMeal?.composition_mode, "DEFAULT_MENU");

  const resetFoodHq = (
    await admin.request(
      "GET",
      `/api/events/${eventId}/hq`,
    )
  ).body.hq;

  assert.equal(
    resetFoodHq?.metrics?.food_services_unready,
    0,
  );

  pass("event meal food customization + explicit empty custom service");
  pass("service-level food readiness");

  /* AFTER HOURS ITEM */

  const afterItemResult =
    await admin.request(
      "POST",
      "/api/food/items",
      {
        event_id: Number(eventId),
        item_id: Number(serviceExtraItemId),
        offering_type: "AFTER_HOURS",
      },
    );

  const afterItemId = String(
    (afterItemResult.body.item as any).item_id,
  );

  pass("after-hours item");

  const snackItemResult =
    await admin.request(
      "POST",
      "/api/food/items",
      {
        event_id: Number(eventId),
        item_id: Number(serviceExtraItemId),
        offering_type: "SNACK",
      },
    );

  assert.equal(
    String((snackItemResult.body.item as any).item_id),
    afterItemId,
  );
  assert.equal((snackItemResult.body.item as any).offering_type, "SNACK");

  const foodLibraryAfterOfferings =
    arrayFrom(
      (
        await admin.request(
          "GET",
          "/api/meals/items",
        )
      ).body,
      "items",
    );

  const brownieAfterOfferings =
    foodLibraryAfterOfferings.find(
      (item) =>
        String(item.id) ===
        String(serviceExtraItemId),
    );

  assert.deepEqual(
    brownieAfterOfferings?.tags,
    [
      "DESSERT",
    ],
  );

  pass("same food offered for snack + after-hours");

  /* NOTIFICATION */

  const notificationResult =
    await admin.request(
      "POST",
      "/api/notifications",
      {
        account_id:
          Number(
            memberAccountId,
          ),
        event_id:
          Number(eventId),
        kind: "general",
        title:
          "Test Camp Notice",
        body:
          "Test notification",
      },
    );

  const notificationId =
    idFrom(
      notificationResult.body,
      "notification",
    );

  pass("member notification");

  const broadcastTitle =
    `Event broadcast ${stamp}`;

  const broadcastResult =
    await admin.request(
      "POST",
      "/api/notifications/broadcast",
      {
        event_id: Number(eventId),
        kind: "general",
        title: broadcastTitle,
        body: "Message for every registered household.",
      },
    );

  assert.equal(
    broadcastResult.body.recipient_count,
    1,
  );

  const scheduledTitle =
    `Future notice ${stamp}`;

  await admin.request(
    "POST",
    "/api/notifications/broadcast",
    {
      event_id: Number(eventId),
      kind: "special",
      title: scheduledTitle,
      body: "This must stay hidden until its scheduled time.",
      scheduled_for: "2099-01-01T12:00:00.000Z",
    },
  );

  pass("event notification broadcast + scheduling");

  /* MEMBER FIRST LOGIN + PASSWORD */

  const memberFirst =
    new Session();

  await memberFirst.login(
    memberUsername,
    resetMemberPassword,
  );

  const memberOldSession =
    new Session();

  await memberOldSession.login(
    memberUsername,
    resetMemberPassword,
  );

  await memberFirst.request(
    "POST",
    "/api/auth/change-password",
    {
      current_password:
        resetMemberPassword,
      new_password:
        "too-short",
    },
    400,
  );

  await memberFirst.request(
    "POST",
    "/api/auth/change-password",
    {
      current_password:
        resetMemberPassword,
      new_password:
        memberPassword,
    },
  );

  await memberFirst.request(
    "GET",
    "/api/auth/me",
  );

  await memberOldSession.request(
    "GET",
    "/api/auth/me",
    undefined,
    401,
  );

  const member =
    new Session();

  await member.login(
    memberUsername,
    memberPassword,
  );

  pass(
    "member password activation",
  );

  /* MEMBER REGISTRATION VISIBILITY */

  const memberRegistrations =
    arrayFrom(
      (
        await member.request(
          "GET",
          "/api/registrations",
        )
      ).body,
      "registrations",
    );

  const memberRegistration =
    memberRegistrations.find(
      (item) =>
        String(item.id) ===
        registrationId,
    );

  assert.ok(
    memberRegistration,
  );

  assert.equal(
    String(
      memberRegistration.cabin_id,
    ),
    cabinId,
  );

  assert.equal(
    memberRegistration.cabin_name,
    renamedCabin,
  );

  assert.equal(
    memberRegistration.cabin_map_slot_id,
    null,
  );

  assert.equal(
    new Date(memberRegistration.event_starts_at).toISOString(),
    eventStart,
  );

  assert.equal(
    new Date(memberRegistration.event_ends_at).toISOString(),
    eventEnd,
  );

  pass(
    "member sees registration + cabin + event dates",
  );

  /* ATTENDEES */

  const attendeePrimaryResult =
    await member.request(
      "POST",
      "/api/member/attendees",
      {
        member_id:
          Number(primaryId),
        event_id:
          Number(eventId),
      },
    );

  const primaryAttendeeId =
    idFrom(
      attendeePrimaryResult.body,
      "attendee",
    );

  const attendeeChildResult =
    await member.request(
      "POST",
      "/api/member/attendees",
      {
        member_id:
          Number(childOneId),
        event_id:
          Number(eventId),
      },
    );

  const childAttendeeId =
    idFrom(
      attendeeChildResult.body,
      "attendee",
    );

  await member.request(
    "POST",
    "/api/member/attendees",
    {
      member_id:
        Number(adultId),
      event_id:
        Number(eventId),
    },
  );

  await member.request(
    "POST",
    "/api/member/attendees",
    {
      member_id:
        Number(childTwoId),
      event_id:
        Number(eventId),
    },
    409,
  );

  pass(
    "paid spot limit enforced",
  );

  const defaultLeadRegistration =
    arrayFrom(
      (
        await member.request(
          "GET",
          "/api/registrations",
        )
      ).body,
      "registrations",
    ).find(
      (item) =>
        String(item.id) ===
        registrationId,
    );

  assert.ok(defaultLeadRegistration);
  assert.equal(
    String(
      defaultLeadRegistration.household_lead_member_id,
    ),
    primaryId,
  );

  await member.request(
    "PATCH",
    "/api/member/household-lead",
    {
      event_id:
        Number(eventId),
      member_id:
        Number(adultId),
    },
  );

  await member.request(
    "PATCH",
    "/api/member/household-lead",
    {
      event_id:
        Number(eventId),
      member_id:
        Number(childOneId),
    },
    409,
  );

  const changedLeadRegistration =
    arrayFrom(
      (
        await member.request(
          "GET",
          "/api/registrations",
        )
      ).body,
      "registrations",
    ).find(
      (item) =>
        String(item.id) ===
        registrationId,
    );

  assert.ok(changedLeadRegistration);
  assert.equal(
    String(
      changedLeadRegistration.household_lead_member_id,
    ),
    adultId,
  );
  assert.equal(
    changedLeadRegistration.household_lead_name,
    "Test Parent Two",
  );

  pass(
    "event household lead + adult-only designation",
  );

  /* MEMBER EVENT DIRECTORY */

  const directoryAccountResult =
    await admin.request(
      "POST",
      "/api/accounts",
      {
        username:
          directoryUsername,
        display_name:
          "Directory Family",
        password:
          tempPassword,
        account_type:
          "member",
      },
    );

  const directoryAccountId =
    idFrom(
      directoryAccountResult.body,
      "account",
    );

  const directoryPrimaryResult =
    await admin.request(
      "POST",
      "/api/household-members",
      {
        account_id:
          Number(directoryAccountId),
        full_name:
          "Directory Guest",
        email:
          "directory@example.test",
        phone:
          "555-0100",
        dietary_restrictions:
          "Private test note",
        member_role:
          "primary",
      },
    );

  const directoryPrimaryId =
    idFrom(
      directoryPrimaryResult.body,
      "household_member",
    );

  const directoryRegistrationResult =
    await admin.request(
      "POST",
      "/api/registrations",
      {
        account_id:
          Number(directoryAccountId),
        event_id:
          Number(eventId),
        spots_paid_for: 1,
      },
    );

  const directoryRegistrationId =
    idFrom(
      directoryRegistrationResult.body,
      "registration",
    );

  await admin.request(
    "PATCH",
    `/api/registrations/${directoryRegistrationId}/cabin`,
    {
      cabin_id:
        Number(moveTargetCabinId),
    },
  );

  const directoryMember =
    new Session();

  await directoryMember.login(
    directoryUsername,
    tempPassword,
  );

  await directoryMember.request(
    "POST",
    "/api/auth/change-password",
    {
      current_password:
        tempPassword,
      new_password:
        directoryPassword,
    },
  );

  await directoryMember.request(
    "POST",
    "/api/member/attendees",
    {
      member_id:
        Number(directoryPrimaryId),
      event_id:
        Number(eventId),
    },
  );

  const memberDirectoryBeforeShare =
    arrayFrom(
      (
        await member.request(
          "GET",
          `/api/member/directory?event_id=${eventId}`,
        )
      ).body,
      "households",
    );

  const directoryOtherBeforeShare =
    memberDirectoryBeforeShare.find(
      (item) =>
        item.household_name ===
        "Directory Family",
    );

  assert.ok(
    directoryOtherBeforeShare,
  );
  assert.equal(
    directoryOtherBeforeShare.cabin_name,
    null,
    "Another household cabin must stay private until explicitly shared",
  );
  assert.deepEqual(
    directoryOtherBeforeShare.members.map(
      (item: any) =>
        item.full_name,
    ),
    ["Directory Guest"],
  );
  assert.equal(
    "email" in directoryOtherBeforeShare,
    false,
  );
  assert.equal(
    "phone" in directoryOtherBeforeShare,
    false,
  );
  assert.equal(
    "dietary_restrictions" in
      directoryOtherBeforeShare,
    false,
  );
  assert.equal(
    "email" in
      directoryOtherBeforeShare.members[0],
    false,
  );
  assert.equal(
    "phone" in
      directoryOtherBeforeShare.members[0],
    false,
  );

  await directoryMember.request(
    "PATCH",
    "/api/member/directory",
    {
      event_id:
        Number(eventId),
      share_cabin_publicly: true,
    },
  );

  const memberDirectoryAfterShare =
    arrayFrom(
      (
        await member.request(
          "GET",
          `/api/member/directory?event_id=${eventId}`,
        )
      ).body,
      "households",
    );

  const directoryOtherAfterShare =
    memberDirectoryAfterShare.find(
      (item) =>
        item.household_name ===
        "Directory Family",
    );

  assert.equal(
    directoryOtherAfterShare?.cabin_name,
    `Move Target Cabin ${stamp}`,
  );

  await member.request(
    "GET",
    "/api/member/directory?event_id=999999999",
    undefined,
    403,
  );

  pass(
    "member event directory + privacy",
  );

  /* ACTIVITY SIGNUP */

  const memberActivities =
    arrayFrom(
      (
        await member.request(
          "GET",
          "/api/member/activities",
        )
      ).body,
      "event_activities",
    );

  assert.ok(
    memberActivities.some(
      (item) =>
        String(item.id) ===
          eventActivityId &&
        item.map_place_id ===
          "waterfront",
    ),
  );

  const signupResult =
    await member.request(
      "POST",
      "/api/member/signups",
      {
        event_activity_id:
          Number(
            eventActivityId,
          ),
        member_attendee_id:
          Number(
            primaryAttendeeId,
          ),
      },
    );

  const signupId =
    idFrom(
      signupResult.body,
      "signup",
    );

  await member.request(
    "POST",
    "/api/member/signups",
    {
      event_activity_id:
        Number(
          eventActivityId,
        ),
      member_attendee_id:
        Number(
          childAttendeeId,
        ),
    },
    409,
  );

  pass(
    "activity capacity enforced",
  );

  /* MEMBER MEALS */

  const visibleMeals =
    arrayFrom(
      (
        await member.request(
          "GET",
          "/api/meals/event-meals",
        )
      ).body,
      "event_meals",
    );

  assert.ok(
    visibleMeals.some(
      (item) =>
        String(item.id) ===
        eventMealId,
    ),
  );

  pass("member meal visibility");

  /* MEMBER NOTIFICATION */

  const notices =
    arrayFrom(
      (
        await member.request(
          "GET",
          "/api/notifications",
        )
      ).body,
      "notifications",
    );

  assert.ok(
    notices.some(
      (item) =>
        String(item.id) ===
        notificationId,
    ),
  );

  assert.ok(
    notices.some(
      (item) =>
        item.title === broadcastTitle,
    ),
  );

  assert.equal(
    notices.some(
      (item) =>
        item.title === scheduledTitle,
    ),
    false,
  );

  assert.equal(
    notices.some(
      (item) =>
        item.source_type === "event_activity" ||
        item.source_type === "event_meal",
    ),
    false,
  );

  const prefs =
    await member.request(
      "PATCH",
      "/api/notifications/preferences",
      {
        activity_reminders:
          true,
        meal_reminders: true,
      },
    );

  assert.equal(
    prefs.body.preferences
      .activity_reminders,
    true,
  );

  pass(
    "notifications + preferences + due-time visibility",
  );

  /* AFTER HOURS ORDER */

  const orderResult =
    await member.request(
      "POST",
      "/api/food/orders",
      {
        event_registration_id:
          Number(
            registrationId,
          ),
        requested_by_member_id:
          Number(primaryId),
        offering_type:
          "AFTER_HOURS",
        fulfillment:
          "pickup",
        items: [
          {
            item_id:
              Number(
                afterItemId,
              ),
            quantity: 1,
          },
        ],
      },
    );

  const orderId =
    String(
      orderResult.body
        .order_id,
    );

  assert.ok(orderId);

  pass("member after-hours order");

  const snackOrderResult =
    await member.request(
      "POST",
      "/api/food/orders",
      {
        event_registration_id: Number(registrationId),
        requested_by_member_id: Number(primaryId),
        offering_type: "SNACK",
        fulfillment: "pickup",
        items: [
          {
            item_id: Number(afterItemId),
            quantity: 1,
          },
        ],
      },
    );

  const snackOrderId = String(snackOrderResult.body.order_id);
  assert.ok(snackOrderId);

  pass("member snack pickup request");

  /* BABYSITTING */

  const babysittingResult =
    await member.request(
      "POST",
      "/api/babysitting",
      {
        event_registration_id:
          Number(
            registrationId,
          ),
        starts_at:
          babysittingStart,
        ends_at:
          babysittingEnd,
        notes:
          "Test sitter request",
        member_ids: [
          Number(childOneId),
        ],
      },
    );

  const babysittingId =
    String(
      babysittingResult.body
        .request_id,
    );

  assert.ok(
    babysittingId,
  );

  pass(
    "member babysitting request",
  );

  /* ADMIN ASSIGNS SERVICES */

  await admin.request(
    "PATCH",
    `/api/food/orders/${orderId}`,
    {
      assigned_staff_member_id:
        Number(
          staffMemberId,
        ),
    },
  );

  await admin.request(
    "PATCH",
    `/api/babysitting/${babysittingId}`,
    {
      sitter_staff_member_id:
        Number(
          staffMemberId,
        ),
      status:
        "confirmed",
    },
  );

  pass(
    "admin service assignments",
  );

  /* STAFF ACTIVATION */

  const staffFirst =
    new Session();

  await staffFirst.login(
    staffUsername,
    tempPassword,
  );

  await staffFirst.request(
    "POST",
    "/api/auth/change-password",
    {
      current_password:
        tempPassword,
      new_password:
        staffPassword,
    },
  );

  const staff =
    new Session();

  await staff.login(
    staffUsername,
    staffPassword,
  );

  pass(
    "staff password activation",
  );

  const staffNoticeResult =
    await admin.request(
      "POST",
      "/api/notifications",
      {
        account_id: Number(staffAccountId),
        event_id: Number(eventId),
        kind: "general",
        title: `Staff notice ${stamp}`,
        body: "Staff can receive operational notices.",
      },
    );

  const staffNotificationId = idFrom(
    staffNoticeResult.body,
    "notification",
  );

  const staffNotices = arrayFrom(
    (
      await staff.request(
        "GET",
        "/api/notifications",
      )
    ).body,
    "notifications",
  );

  assert.ok(
    staffNotices.some(
      (item) =>
        String(item.id) ===
        staffNotificationId,
    ),
  );

  assert.equal(
    staffNotices.some(
      (item) =>
        item.source_type === "event_activity",
    ),
    false,
  );

  pass("staff notices + automatic reminder scheduling");

  /* STAFF DAY */

  const staffActivities =
    arrayFrom(
      (
        await staff.request(
          "GET",
          "/api/staff-day/activities",
        )
      ).body,
      "activities",
    );

  assert.ok(
    staffActivities.some(
      (item) =>
        String(item.id) ===
        eventActivityId,
    ),
  );

  const participants =
    arrayFrom(
      (
        await staff.request(
          "GET",
          "/api/staff-day/participants",
        )
      ).body,
      "participants",
    );

  assert.ok(
    participants.some(
      (item) =>
        String(
          item.signup_id,
        ) === signupId,
    ),
  );

  pass(
    "staff sees assignment + participant",
  );

  await staff.request(
    "POST",
    `/api/staff-day/signups/${signupId}/check-in`,
  );

  let memberSignups =
    arrayFrom(
      (
        await member.request(
          "GET",
          "/api/member/signups",
        )
      ).body,
      "signups",
    );

  let signup =
    memberSignups.find(
      (item) =>
        String(item.id) ===
        signupId,
    );

  assert.ok(
    signup?.checked_in_at,
  );

  const firstCheckedInAt =
    signup.checked_in_at;

  await staff.request(
    "POST",
    `/api/staff-day/signups/${signupId}/check-in`,
  );

  memberSignups =
    arrayFrom(
      (
        await member.request(
          "GET",
          "/api/member/signups",
        )
      ).body,
      "signups",
    );

  signup =
    memberSignups.find(
      (item) =>
        String(item.id) ===
        signupId,
    );

  assert.equal(
    signup?.checked_in_at,
    firstCheckedInAt,
  );

  pass("staff attendance + retry safety");

  /* STAFF SERVICES */

  const staffOrders =
    arrayFrom(
      (
        await staff.request(
          "GET",
          "/api/food/orders",
        )
      ).body,
      "orders",
    );

  assert.ok(
    staffOrders.some(
      (item) =>
        String(item.id) ===
        orderId,
    ),
  );

  const staffBabysitting =
    arrayFrom(
      (
        await staff.request(
          "GET",
          "/api/babysitting",
        )
      ).body,
      "requests",
    );

  assert.ok(
    staffBabysitting.some(
      (item) =>
        String(item.id) ===
        babysittingId,
    ),
  );

  pass(
    "staff service visibility",
  );

  const staffOrder =
    staffOrders.find(
      (item) =>
        String(item.id) ===
        orderId,
    );

  assert.ok(
    Array.isArray(
      staffOrder?.items,
    ),
  );

  assert.ok(
    staffOrder.items.some(
      (item: any) =>
        String(item.item_id) ===
          afterItemId &&
        item.quantity === 1,
    ),
  );

  pass(
    "after-hours order item visibility",
  );

  await staff.request(
    "PATCH",
    `/api/food/orders/${orderId}/fulfill`,
  );

  await staff.request(
    "PATCH",
    `/api/babysitting/${babysittingId}/complete`,
  );

  const completedStaffOrders =
    arrayFrom(
      (
        await staff.request(
          "GET",
          "/api/food/orders",
        )
      ).body,
      "orders",
    );

  assert.equal(
    completedStaffOrders.find(
      (item) =>
        String(item.id) ===
        orderId,
    )?.status,
    "fulfilled",
  );

  const completedStaffBabysitting =
    arrayFrom(
      (
        await staff.request(
          "GET",
          "/api/babysitting",
        )
      ).body,
      "requests",
    );

  assert.equal(
    completedStaffBabysitting.find(
      (item) =>
        String(item.id) ===
        babysittingId,
    )?.status,
    "completed",
  );

  pass(
    "staff completes assigned service work",
  );

  /* STRICT EVENT SCOPING */

  const scopedRegistrations = arrayFrom(
    (
      await admin.request(
        "GET",
        `/api/registrations?event_id=${eventId}`,
      )
    ).body,
    "registrations",
  );

  assert.ok(
    scopedRegistrations.some(
      (item) => String(item.id) === registrationId,
    ),
  );
  assert.ok(
    scopedRegistrations.every(
      (item) => String(item.event_id) === eventId,
    ),
  );

  const scopedMeals = arrayFrom(
    (
      await admin.request(
        "GET",
        `/api/meals/event-meals?event_id=${eventId}`,
      )
    ).body,
    "event_meals",
  );

  assert.ok(scopedMeals.length > 0);
  assert.ok(
    scopedMeals.every(
      (item) => String(item.event_id) === eventId,
    ),
  );

  const scopedActivities = arrayFrom(
    (
      await admin.request(
        "GET",
        `/api/scheduling/event-activities?event_id=${eventId}`,
      )
    ).body,
    "event_activities",
  );

  assert.ok(
    scopedActivities.some(
      (item) => String(item.id) === eventActivityId,
    ),
  );
  assert.ok(
    scopedActivities.every(
      (item) => String(item.event_id) === eventId,
    ),
  );

  const scopedOrders = arrayFrom(
    (
      await admin.request(
        "GET",
        `/api/food/orders?event_id=${eventId}`,
      )
    ).body,
    "orders",
  );

  assert.ok(
    scopedOrders.some(
      (item) => String(item.id) === orderId,
    ),
  );
  assert.ok(
    scopedOrders.some(
      (item) => String(item.id) === snackOrderId,
    ),
  );
  assert.ok(
    scopedOrders.every(
      (item) => String(item.event_id) === eventId,
    ),
  );

  const scopedBabysitting = arrayFrom(
    (
      await admin.request(
        "GET",
        `/api/babysitting?event_id=${eventId}`,
      )
    ).body,
    "requests",
  );

  assert.ok(
    scopedBabysitting.some(
      (item) => String(item.id) === babysittingId,
    ),
  );
  assert.ok(
    scopedBabysitting.every(
      (item) => String(item.event_id) === eventId,
    ),
  );

  const missingEventId = Number(eventId) + 1000000;

  const emptyScopedReads = await Promise.all([
    admin.request(
      "GET",
      `/api/registrations?event_id=${missingEventId}`,
    ),
    admin.request(
      "GET",
      `/api/meals/event-meals?event_id=${missingEventId}`,
    ),
    admin.request(
      "GET",
      `/api/scheduling/event-activities?event_id=${missingEventId}`,
    ),
    admin.request(
      "GET",
      `/api/food/orders?event_id=${missingEventId}`,
    ),
    admin.request(
      "GET",
      `/api/babysitting?event_id=${missingEventId}`,
    ),
  ]);

  assert.equal(
    arrayFrom(emptyScopedReads[0].body, "registrations").length,
    0,
  );
  assert.equal(
    arrayFrom(emptyScopedReads[1].body, "event_meals").length,
    0,
  );
  assert.equal(
    arrayFrom(emptyScopedReads[2].body, "event_activities").length,
    0,
  );
  assert.equal(
    arrayFrom(emptyScopedReads[3].body, "orders").length,
    0,
  );
  assert.equal(
    arrayFrom(emptyScopedReads[4].body, "requests").length,
    0,
  );

  pass("strict event-id scoped reads");

  /* DEVELOPMENT ALUMNI WEEKEND DEMO */

  const demoResult =
    await admin.request(
      "POST",
      "/api/dev/demo/seed-alumni-weekend",
    );

  assert.equal(
    demoResult.body.mode,
    "seed-alumni-weekend",
  );

  const demoEvents =
    arrayFrom(
      (
        await admin.request(
          "GET",
          "/api/events",
        )
      ).body,
      "events",
    );

  const demoEvent =
    demoEvents.find(
      (item) =>
        item.name ===
        "Alumni Weekend",
    );

  assert.ok(demoEvent);

  const demoStartDate =
    newYorkDateKey(
      String(demoEvent.starts_at),
    );

  assert.equal(
    demoStartDate,
    newYorkDateKey(new Date()),
    "Alumni Weekend should start on the day it is seeded",
  );

  const demoActivities =
    arrayFrom(
      (
        await admin.request(
          "GET",
          "/api/scheduling/event-activities",
        )
      ).body,
      "event_activities",
    ).filter(
      (item) =>
        String(item.event_id) ===
        String(demoEvent.id),
    );

  assert.equal(
    demoActivities.length,
    19,
  );

  assert.ok(
    demoActivities.every(
      (item) => Boolean(item.map_place_id),
    ),
    "Family Camp activities should carry stable map place ids",
  );

  assert.ok(
    demoActivities.some(
      (item) =>
        item.activity_name ===
          "Campfire & S'mores" &&
        item.map_place_id ===
          "camp-fire",
    ),
    "Campfire should target the camp-fire vector component by id",
  );

  const demoMeals =
    arrayFrom(
      (
        await admin.request(
          "GET",
          "/api/meals/event-meals",
        )
      ).body,
      "event_meals",
    ).filter(
      (item) =>
        String(item.event_id) ===
        String(demoEvent.id),
    );

  assert.equal(
    demoMeals.length,
    9,
  );

  assert.ok(
    demoMeals.every(
      (item) =>
        Boolean(item.menu_id) &&
        item.menu_name === "Family Camp Menu",
    ),
    "Family Camp should assign one reusable Family Camp Menu at the event level",
  );

  const dayOneDinner = demoMeals.find(
    (item) =>
      item.meal_type_name === "Dinner" &&
      newYorkDateKey(
        String(item.starts_at),
      ) === demoStartDate,
  );

  assert.ok(
    Array.isArray(dayOneDinner?.items) &&
      dayOneDinner.items.length > 0,
    "Day 1 dinner should resolve food from the event menu automatically",
  );

  assert.ok(
    demoMeals.some(
      (item) =>
        item.title === "Banquet" &&
        item.meal_type_name === "Dinner",
    ),
    "Banquet should be scheduled as Friday dinner, not as an activity",
  );

  const demoRegistrations =
    arrayFrom(
      (
        await admin.request(
          "GET",
          "/api/registrations",
        )
      ).body,
      "registrations",
    ).filter(
      (item) =>
        String(item.event_id) ===
        String(demoEvent.id),
    );

  assert.equal(
    demoRegistrations.length,
    10,
  );

  assert.ok(
    demoRegistrations.every(
      (item) =>
        Boolean(item.cabin_id),
    ),
    "Every demo household should have a real cabin assigned",
  );

  assert.ok(
    demoRegistrations.every(
      (item) =>
        Boolean(
          item.cabin_map_slot_id,
        ),
    ),
    "Every demo household cabin should resolve to its permanent reusable map structure",
  );

  const demoCabins =
    arrayFrom(
      (
        await admin.request(
          "GET",
          "/api/cabins",
        )
      ).body,
      "cabins",
    );

  const expectedReusableCabins = [
    ...Array.from(
      { length: 32 },
      (_, index) => [
        `Cabin ${index + 1}`,
        `cabin-${index + 1}`,
      ] as const,
    ),
    ["The Hilton", "the-hilton"] as const,
    ["The Hyatt", "the-hyatt"] as const,
    ["The Beehive", "the-beehive"] as const,
  ];

  for (const [
    cabinName,
    mapSlotId,
  ] of expectedReusableCabins) {
    const cabin =
      demoCabins.find(
        (item) =>
          item.name === cabinName,
      );

    assert.ok(
      cabin,
      `${cabinName} should exist in reusable setup`,
    );

    assert.equal(
      cabin.map_slot_id,
      mapSlotId,
      `${cabinName} should keep its permanent map structure`,
    );
  }

  pass(
    "reusable cabin map preset",
  );

  const demoLibraryItems = arrayFrom(
    (
      await admin.request(
        "GET",
        "/api/meals/items",
      )
    ).body,
    "items",
  );

  assert.ok(
    demoLibraryItems.length >= 60,
    "Family Camp demo should populate the reusable menu item library",
  );

  assert.ok(
    demoLibraryItems.some(
      (item) => item.name === "Beef stir fry",
    ),
    "Family Camp food should exist in the reusable item library",
  );

  const demoMenuItems = arrayFrom(
    (
      await admin.request(
        "GET",
        "/api/meals/menu-items",
      )
    ).body,
    "menu_items",
  );

  assert.ok(
    demoMenuItems.length >= 12,
    "Family Camp demo should include usable meal menu items",
  );

  assert.ok(
    demoMenuItems.some(
      (item) =>
        item.day_of_week === 3 &&
        item.meal_type_name === "Dinner" &&
        item.name === "Beef stir fry",
    ),
    "Family Camp menu should preserve weekday + meal sections",
  );

  const demoMenus = arrayFrom(
    (
      await admin.request(
        "GET",
        "/api/meals/menus",
      )
    ).body,
    "menus",
  );

  assert.ok(
    demoMenus.some((item) => item.name === "Family Camp Menu"),
    "Family Camp demo should reuse or create the Family Camp Menu without clearing other menu-library records",
  );

  const menuPresets = arrayFrom(
    (
      await admin.request(
        "GET",
        "/api/meals/presets",
      )
    ).body,
    "presets",
  );

  assert.ok(
    menuPresets.some(
      (preset) => preset.key === "family-camp",
    ),
    "Family Camp menu should be available as an instant preset",
  );

  const presetSeed = await admin.request(
    "POST",
    "/api/meals/presets/family-camp",
  );

  assert.equal(
    presetSeed.body.key,
    "family-camp",
  );

  const appliedMenu = await admin.request(
    "POST",
    `/api/meals/menus/${presetSeed.body.menu_id}/apply-to-event`,
    {
      event_id: Number(demoEvent.id),
    },
  );

  assert.equal(
    appliedMenu.body.scheduled_meals,
    9,
  );

  assert.equal(
    String(appliedMenu.body.menu_id),
    String(presetSeed.body.menu_id),
  );

  pass(
    "reusable menu preset + event apply",
  );

  const demoAfterHoursItems = arrayFrom(
    (
      await admin.request(
        "GET",
        `/api/food/items?event_id=${demoEvent.id}`,
      )
    ).body,
    "items",
  );

  assert.ok(
    demoAfterHoursItems.length >= 4,
    "Family Camp demo should include an after-hours catalog",
  );

  const demoFoodOrders =
    arrayFrom(
      (
        await admin.request(
          "GET",
          `/api/food/orders?event_id=${demoEvent.id}`,
        )
      ).body,
      "orders",
    );

  assert.equal(
    demoFoodOrders.length,
    5,
    "Family Camp demo should include five seeded food requests",
  );

  assert.ok(
    demoFoodOrders.some(
      (item) =>
        item.offering_type === "SNACK" &&
        item.status === "open" &&
        !item.assigned_staff_member_id,
    ),
    "Family Camp demo should leave one snack request open and unassigned",
  );

  assert.ok(
    demoFoodOrders.some(
      (item) =>
        item.offering_type === "AFTER_HOURS" &&
        item.status === "fulfilled",
    ),
    "Family Camp demo should include fulfilled after-hours history",
  );

  assert.ok(
    demoFoodOrders.some(
      (item) =>
        item.status === "cancelled",
    ),
    "Family Camp demo should include cancelled service history",
  );

  const cloneStart = new Date(
    String(demoEvent.starts_at),
  );
  cloneStart.setUTCDate(
    cloneStart.getUTCDate() + 364,
  );

  const cloneResult = await admin.request(
    "POST",
    `/api/events/${demoEvent.id}/clone`,
    {
      name: "Alumni Weekend 2027",
      starts_at: cloneStart.toISOString(),
    },
  );

  const clonedEventId = String(
    cloneResult.body.event.id,
  );

  assert.equal(
    cloneResult.body.event.name,
    "Alumni Weekend 2027",
  );
  assert.equal(
    cloneResult.body.copied.activities,
    demoActivities.length,
  );
  assert.equal(
    cloneResult.body.copied.food_services,
    demoMeals.length,
  );

  const clonedActivities = arrayFrom(
    (
      await admin.request(
        "GET",
        `/api/scheduling/event-activities?event_id=${clonedEventId}`,
      )
    ).body,
    "event_activities",
  );

  assert.equal(
    clonedActivities.length,
    demoActivities.length,
  );
  const clonedStaffAssignments = arrayFrom(
    (
      await admin.request(
        "GET",
        `/api/scheduling/event-activity-staff?event_id=${clonedEventId}`,
      )
    ).body,
    "event_activity_staff",
  );

  assert.equal(
    clonedStaffAssignments.length,
    0,
    "Cloned event should not copy concrete staff assignments",
  );

  const clonedMeals = arrayFrom(
    (
      await admin.request(
        "GET",
        `/api/meals/event-meals?event_id=${clonedEventId}`,
      )
    ).body,
    "event_meals",
  );

  assert.equal(
    clonedMeals.length,
    demoMeals.length,
  );
  assert.ok(
    clonedMeals.every(
      (item) =>
        String(item.menu_id) ===
        String(demoEvent.meal_menu_id),
    ),
    "Clone should preserve the reusable event menu",
  );

  const clonedOfferings = arrayFrom(
    (
      await admin.request(
        "GET",
        `/api/food/items?event_id=${clonedEventId}`,
      )
    ).body,
    "items",
  );

  assert.equal(
    clonedOfferings.length,
    demoAfterHoursItems.length,
  );

  const clonedRegistrations = arrayFrom(
    (
      await admin.request(
        "GET",
        `/api/registrations?event_id=${clonedEventId}`,
      )
    ).body,
    "registrations",
  );

  assert.equal(
    clonedRegistrations.length,
    0,
    "Clone should not copy households, cabins, or attendance history",
  );

  pass("event clone copies setup only");

  const reusableActivitiesBeforeReset = arrayFrom(
    (await admin.request("GET", "/api/activities")).body,
    "activities",
  ).length;
  const reusableMenusBeforeReset = arrayFrom(
    (await admin.request("GET", "/api/meals/menus")).body,
    "menus",
  ).length;
  const demoStaffBeforeGuestClear = arrayFrom(
    (await admin.request("GET", "/api/staff-members")).body,
    "staff_members",
  ).length;

  await admin.request(
    "POST",
    "/api/dev/demo/clear-guests-events",
  );

  assert.equal(
    arrayFrom((await admin.request("GET", "/api/events")).body, "events").length,
    0,
    "Guest clear should remove event instances",
  );
  assert.equal(
    arrayFrom((await admin.request("GET", "/api/staff-members")).body, "staff_members").length,
    demoStaffBeforeGuestClear,
    "Guest clear should keep staff",
  );
  assert.equal(
    arrayFrom((await admin.request("GET", "/api/activities")).body, "activities").length,
    reusableActivitiesBeforeReset,
    "Guest clear should keep the activity library",
  );
  assert.equal(
    arrayFrom((await admin.request("GET", "/api/meals/menus")).body, "menus").length,
    reusableMenusBeforeReset,
    "Guest clear should keep the menu library",
  );

  pass("demo clear guests keeps staff + reusable setup");

  await admin.request(
    "POST",
    "/api/dev/demo/seed-alumni-weekend",
  );

  const reusableActivitiesBeforePeopleClear = arrayFrom(
    (await admin.request("GET", "/api/activities")).body,
    "activities",
  ).length;
  const reusableMenusBeforePeopleClear = arrayFrom(
    (await admin.request("GET", "/api/meals/menus")).body,
    "menus",
  ).length;

  await admin.request(
    "POST",
    "/api/dev/demo/clear-people-events",
  );

  assert.equal(
    arrayFrom((await admin.request("GET", "/api/events")).body, "events").length,
    0,
    "People clear should remove event instances",
  );
  assert.equal(
    arrayFrom((await admin.request("GET", "/api/staff-members")).body, "staff_members").length,
    0,
    "People clear should remove staff",
  );
  assert.equal(
    arrayFrom((await admin.request("GET", "/api/activities")).body, "activities").length,
    reusableActivitiesBeforePeopleClear,
    "People clear should keep the activity library",
  );
  assert.equal(
    arrayFrom((await admin.request("GET", "/api/meals/menus")).body, "menus").length,
    reusableMenusBeforePeopleClear,
    "People clear should keep the menu library",
  );

  pass("demo clear people keeps admin + reusable setup");

  pass(
    "Alumni Weekend demo load",
  );

  console.log("");
  console.log(
    "======================================",
  );
  console.log(
    "APPOPONI CHECK: PASS",
  );
  console.log(
    "======================================",
  );
  console.log(
    `Event: ${eventId}`,
  );
  console.log(
    `Member account: ${memberUsername}`,
  );
  console.log(
    `Staff account: ${staffUsername}`,
  );
  console.log(
    "Test records exist only inside the disposable check database and are removed when the check finishes.",
  );
}

main().catch((error) => {
  console.error("");
  console.error(
    "======================================",
  );
  console.error(
    "APPOPONI CHECK: FAIL",
  );
  console.error(
    "======================================",
  );
  console.error(
    error instanceof Error
      ? error.stack
      : error,
  );

  process.exitCode = 1;
});
