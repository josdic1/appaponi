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

const tempPassword =
  `temp-${stamp}`;

const memberPassword =
  `member-${stamp}`;

const staffPassword =
  `staff-${stamp}`;

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
          "Regression Parent",
        member_role:
          "primary",
      },
    );

  const primaryId =
    idFrom(
      primaryResult.body,
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
          "Regression Child One",
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
          "Regression Child Two",
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
    "household primary + children",
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
          "Regression Staff",
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
          `Regression Waterfront ${stamp}`,
        map_x: 0.3,
        map_y: 0.4,
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
          `Regression Canoeing ${stamp}`,
        area_id:
          Number(areaId),
        setting:
          "outside",
      },
    );

  const activityId =
    idFrom(
      activityResult.body,
      "activity",
    );

  pass("area + activity");

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
          `Regression Family Camp ${stamp}`,
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

  pass("Family Camp event");

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
        spots_paid_for: 2,
      },
    );

  const registrationId =
    idFrom(
      registrationResult.body,
      "registration",
    );

  pass("event registration");

  /* MEALS */

  const menuResult =
    await admin.request(
      "POST",
      "/api/meals/menus",
      {
        name:
          `Regression Camp Dinner ${stamp}`,
        description:
          "Regression dinner menu",
      },
    );

  const menuId =
    idFrom(
      menuResult.body,
      "menu",
    );

  await admin.request(
    "POST",
    "/api/meals/menu-items",
    {
      menu_id:
        Number(menuId),
      name:
        "Regression Grilled Chicken",
      dietary_notes:
        "Gluten free",
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

  const eventMealResult =
    await admin.request(
      "POST",
      "/api/meals/event-meals",
      {
        event_id:
          Number(eventId),
        meal_type_id:
          Number(dinner.id),
        menu_id:
          Number(menuId),
        title:
          "Regression Camp Dinner",
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

  pass("menu + scheduled meal");

  /* AFTER HOURS ITEM */

  const afterItemResult =
    await admin.request(
      "POST",
      "/api/after-hours/items",
      {
        name:
          `Regression Late Snack ${stamp}`,
        description:
          "Regression snack",
      },
    );

  const afterItemId =
    idFrom(
      afterItemResult.body,
      "item",
    );

  pass("after-hours item");

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
          "Regression Camp Notice",
        body:
          "Regression notification",
      },
    );

  const notificationId =
    idFrom(
      notificationResult.body,
      "notification",
    );

  pass("member notification");

  /* MEMBER FIRST LOGIN + PASSWORD */

  const memberFirst =
    new Session();

  await memberFirst.login(
    memberUsername,
    tempPassword,
  );

  await memberFirst.request(
    "POST",
    "/api/auth/change-password",
    {
      current_password:
        tempPassword,
      new_password:
        memberPassword,
    },
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

  assert.ok(
    memberRegistrations.some(
      (item) =>
        String(item.id) ===
        registrationId,
    ),
  );

  pass(
    "member sees registration",
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
        Number(childTwoId),
      event_id:
        Number(eventId),
    },
    409,
  );

  pass(
    "paid spot limit enforced",
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
        eventActivityId,
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
    "notifications + preferences",
  );

  /* AFTER HOURS ORDER */

  const orderResult =
    await member.request(
      "POST",
      "/api/after-hours/orders",
      {
        event_registration_id:
          Number(
            registrationId,
          ),
        requested_by_member_id:
          Number(primaryId),
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
          "Regression sitter request",
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
    `/api/after-hours/orders/${orderId}`,
    {
      assigned_staff_member_id:
        Number(
          staffMemberId,
        ),
      status:
        "fulfilled",
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

  pass("staff check-in");

  await staff.request(
    "POST",
    `/api/staff-day/signups/${signupId}/check-out`,
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

  assert.ok(
    signup?.checked_out_at,
  );

  pass("staff check-out");

  /* STAFF SERVICES */

  const staffOrders =
    arrayFrom(
      (
        await staff.request(
          "GET",
          "/api/after-hours/orders",
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

  console.log("");
  console.log(
    "======================================",
  );
  console.log(
    "APPOPONI FAMILY CAMP REGRESSION: PASS",
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
    "Regression records are intentionally retained so they can be inspected in Admin, Member, Staff, and Builder.",
  );
}

main().catch((error) => {
  console.error("");
  console.error(
    "======================================",
  );
  console.error(
    "APPOPONI FAMILY CAMP REGRESSION: FAIL",
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
