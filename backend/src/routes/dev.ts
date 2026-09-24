import { Router } from "express";

import type {
  PoolClient,
} from "pg";

import type {
  AccountType,
  SessionAccount,
} from "@appoponi/shared/schemas/auth";

import { pool } from "../db/pool.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

import {
  createAccessToken,
  hashPassword,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "../services/auth.js";

import {
  createFamilyCampSeed,
} from "../demo/familyCampSeed.js";
import {
  familyCampMenuSeed,
} from "../demo/familyCampMenu.js";
import {
  seedMenu,
} from "../services/menuSeeds.js";

export const devRouter = Router();

function requireTestLogin(
  _req: unknown,
  res: any,
  next: any,
) {
  const enabled =
    process.env.NODE_ENV !== "production" ||
    process.env.TEST_LOGIN_ENABLED === "true";

  if (!enabled) {
    res.status(403).json({
      error: "Test login is disabled",
    });
    return;
  }

  next();
}

devRouter.get(
  "/accounts",
  requireTestLogin,
  async (_req, res) => {
    try {
      const result = await pool.query<{
        id: string;
        username: string;
        display_name: string | null;
        account_type: AccountType;
        must_change_password: boolean;
      }>(`
        SELECT
          a.id,
          a.username,
          COALESCE(
            sm.full_name,
            a.display_name
          ) AS display_name,
          a.account_type,
          a.must_change_password
        FROM accounts a
        LEFT JOIN staff_members sm
          ON sm.account_id = a.id
        ORDER BY
          CASE a.account_type
            WHEN 'member' THEN 1
            WHEN 'staff' THEN 2
            WHEN 'admin' THEN 3
          END,
          LOWER(
            COALESCE(
              sm.full_name,
              a.display_name,
              a.username
            )
          ),
          a.id
      `);

      res.json({
        accounts: result.rows,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error:
          "Could not load development accounts",
      });
    }
  },
);

devRouter.post(
  "/login/:id",
  requireTestLogin,
  async (req, res) => {
    try {
      const result =
        await pool.query<
          SessionAccount & {
            session_version: number;
          }
        >(
          `
            SELECT
              id,
              username,
              account_type,
              must_change_password,
              session_version
            FROM accounts
            WHERE id = $1
            LIMIT 1
          `,
          [req.params.id],
        );

      const account = result.rows[0];

      if (!account) {
        res.status(404).json({
          error:
            "Development account does not exist",
        });
        return;
      }

      const token =
        createAccessToken(account);

      res.cookie(
        SESSION_COOKIE_NAME,
        token,
        sessionCookieOptions(),
      );

      res.json({ account });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error:
          "Development login failed",
      });
    }
  },
);


type DemoMode =
  | "clear-people-events"
  | "clear-guests-events"
  | "seed-family-camp";

const eventTypeNames = [
  "Family Camp",
  "Wedding",
  "Retreat",
  "Reunion",
  "Corporate",
  "Other",
];

const mealTypeNames = [
  "Breakfast",
  "Brunch",
  "Lunch",
  "Dinner",
  "Reception",
  "Cocktail",
  "Special",
];

async function inTransaction<T>(
  work: (
    client: PoolClient,
  ) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result =
      await work(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function recordDemoAction(
  client: PoolClient,
  mode: DemoMode,
  details: Record<string, unknown>,
) {
  await client.query(
    `
      INSERT INTO audit_log (
        table_name,
        row_id,
        action,
        old_values,
        new_values,
        actor_account_id
      )
      VALUES (
        'demo_tools',
        $1,
        'UPDATE',
        NULL,
        $2::jsonb,
        NULL
      )
    `,
    [
      mode,
      JSON.stringify(details),
    ],
  );
}

async function seedFixedTypes(
  client: PoolClient,
) {
  for (const name of eventTypeNames) {
    await client.query(
      `
        INSERT INTO event_types (name)
        VALUES ($1)
        ON CONFLICT (name) DO NOTHING
      `,
      [name],
    );
  }

  for (const name of mealTypeNames) {
    await client.query(
      `
        INSERT INTO meal_types (name)
        VALUES ($1)
        ON CONFLICT (name) DO NOTHING
      `,
      [name],
    );
  }
}

async function clearPeopleAndEvents(
  client: PoolClient,
) {
  const removableAccounts =
    await client.query<{
      id: string;
    }>(
      `
        SELECT id
        FROM accounts
        WHERE account_type IN ('member', 'staff')
      `,
    );

  const removableIds =
    removableAccounts.rows.map(
      (row) => row.id,
    );

  if (removableIds.length) {
    await client.query(
      `
        DELETE FROM notifications
        WHERE event_id IS NOT NULL
           OR account_id = ANY($1::bigint[])
      `,
      [removableIds],
    );

    await client.query(
      `
        DELETE FROM notification_preferences
        WHERE account_id = ANY($1::bigint[])
      `,
      [removableIds],
    );
  } else {
    await client.query(`
      DELETE FROM notifications
      WHERE event_id IS NOT NULL
    `);
  }

  await client.query(`
    TRUNCATE TABLE
      notifications,
      food_order_items,
      event_food_offerings,
      event_meal_items,
      babysitting_request_members,
      event_activity_signups,
      event_activity_staff,
      food_orders,
      babysitting_requests,
      event_meals,
      member_attendees,
      event_registrations,
      event_activities,
      event_type_others,
      staff_member_areas,
      staff_qualifications,
      household_members,
      staff_members,
      events
    RESTART IDENTITY
  `);

  await client.query(`
    DELETE FROM accounts
    WHERE account_type <> 'admin'
  `);

  await seedFixedTypes(client);

  await recordDemoAction(
    client,
    "clear-people-events",
    {
      result:
        "Staff, members, and event instances cleared. Admin accounts and reusable setup retained.",
    },
  );
}

async function clearGuestsAndEvents(
  client: PoolClient,
) {
  const memberAccounts =
    await client.query<{
      id: string;
    }>(
      `
        SELECT id
        FROM accounts
        WHERE account_type = 'member'
      `,
    );

  const memberIds =
    memberAccounts.rows.map(
      (row) => row.id,
    );

  if (memberIds.length) {
    await client.query(
      `
        DELETE FROM notifications
        WHERE event_id IS NOT NULL
           OR account_id = ANY($1::bigint[])
      `,
      [memberIds],
    );

    await client.query(
      `
        DELETE FROM notification_preferences
        WHERE account_id = ANY($1::bigint[])
      `,
      [memberIds],
    );
  } else {
    await client.query(`
      DELETE FROM notifications
      WHERE event_id IS NOT NULL
    `);
  }

  await client.query(`
    TRUNCATE TABLE
      notifications,
      food_order_items,
      event_food_offerings,
      event_meal_items,
      babysitting_request_members,
      event_activity_signups,
      event_activity_staff,
      food_orders,
      babysitting_requests,
      event_meals,
      member_attendees,
      event_registrations,
      event_activities,
      event_type_others,
      events,
      household_members
    RESTART IDENTITY
  `);

  await client.query(`
    DELETE FROM accounts
    WHERE account_type = 'member'
  `);

  await recordDemoAction(
    client,
    "clear-guests-events",
    {
      result:
        "Members, household profiles, registrations, events, schedules, signups, service requests, and event notices cleared. Staff and camp setup retained.",
    },
  );
}

async function ensureArea(
  client: PoolClient,
  name: string,
) {
  const result =
    await client.query<{
      id: string;
    }>(
      `
        INSERT INTO areas (name)
        VALUES ($1)
        ON CONFLICT (name)
        DO UPDATE SET
          name = EXCLUDED.name
        RETURNING id
      `,
      [name],
    );

  return result.rows[0].id;
}

async function ensureActivity(
  client: PoolClient,
  input: {
    name: string;
    area: string;
    setting:
      | "inside"
      | "outside"
      | "other";
    map_place_id: string;
  },
) {
  const areaId =
    await ensureArea(
      client,
      input.area,
    );

  const result =
    await client.query<{
      id: string;
    }>(
      `
        INSERT INTO activities (
          name,
          area_id,
          setting,
          map_place_id
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name)
        DO UPDATE SET
          area_id = EXCLUDED.area_id,
          setting = EXCLUDED.setting,
          map_place_id = EXCLUDED.map_place_id
        RETURNING id
      `,
      [
        input.name,
        areaId,
        input.setting,
        input.map_place_id,
      ],
    );

  return result.rows[0].id;
}

async function ensureCabin(
  client: PoolClient,
  input: {
    name: string;
    mapSlotId: string | null;
  },
) {
  const areaId = await ensureArea(
    client,
    "Lodging / Cabins",
  );

  const result =
    await client.query<{
      id: string;
    }>(
      `
        INSERT INTO cabins (
          name,
          area_id,
          map_slot_id
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (name)
        DO UPDATE SET
          area_id = EXCLUDED.area_id,
          map_slot_id = EXCLUDED.map_slot_id
        RETURNING id
      `,
      [
        input.name,
        areaId,
        input.mapSlotId,
      ],
    );

  return result.rows[0].id;
}

async function ensureStaff(
  client: PoolClient,
  input: {
    username: string;
    fullName: string;
    babysittingEligible: boolean;
  },
) {
  const passwordHash =
    await hashPassword("demo");

  const accountResult =
    await client.query<{
      id: string;
      account_type: AccountType;
    }>(
      `
        INSERT INTO accounts (
          username,
          display_name,
          password_hash,
          account_type,
          must_change_password
        )
        VALUES (
          $1,
          $2,
          $3,
          'staff',
          FALSE
        )
        ON CONFLICT (
          (
            regexp_replace(
              lower(username),
              '[[:space:]]+',
              '',
              'g'
            )
          )
        )
        DO UPDATE SET
          username = EXCLUDED.username,
          display_name =
            EXCLUDED.display_name
        RETURNING
          id,
          account_type
      `,
      [
        input.username,
        input.fullName,
        passwordHash,
      ],
    );

  const account =
    accountResult.rows[0];

  if (
    account.account_type !== "staff"
  ) {
    throw new Error(
      `${input.username} already exists and is not a staff account`,
    );
  }

  const staffResult =
    await client.query<{
      id: string;
    }>(
      `
        INSERT INTO staff_members (
          account_id,
          full_name,
          role,
          babysitting_eligible
        )
        VALUES (
          $1,
          $2,
          'staff',
          $3
        )
        ON CONFLICT (account_id)
        DO UPDATE SET
          full_name = EXCLUDED.full_name,
          babysitting_eligible =
            EXCLUDED.babysitting_eligible
        RETURNING id
      `,
      [
        account.id,
        input.fullName,
        input.babysittingEligible,
      ],
    );

  return {
    accountId: account.id,
    staffMemberId:
      staffResult.rows[0].id,
  };
}

async function ensureMemberHousehold(
  client: PoolClient,
  input: {
    username: string;
    displayName: string;
    people: Array<{
      fullName: string;
      role:
        | "primary"
        | "adult"
        | "child";
      email?: string | null;
      phone?: string | null;
      dietary?: string | null;
    }>;
  },
) {
  const passwordHash =
    await hashPassword("demo");

  const accountResult =
    await client.query<{
      id: string;
    }>(
      `
        INSERT INTO accounts (
          username,
          display_name,
          password_hash,
          account_type,
          must_change_password
        )
        VALUES (
          $1,
          $2,
          $3,
          'member',
          FALSE
        )
        RETURNING id
      `,
      [
        input.username,
        input.displayName,
        passwordHash,
      ],
    );

  const accountId =
    accountResult.rows[0].id;

  const people:
    Array<{
      id: string;
      fullName: string;
      role: string;
    }> = [];

  for (const person of input.people) {
    const result =
      await client.query<{
        id: string;
      }>(
        `
          INSERT INTO household_members (
            account_id,
            full_name,
            email,
            phone,
            dietary_restrictions,
            member_role
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
          RETURNING id
        `,
        [
          accountId,
          person.fullName,
          person.email ?? null,
          person.phone ?? null,
          person.dietary ?? null,
          person.role,
        ],
      );

    people.push({
      id: result.rows[0].id,
      fullName: person.fullName,
      role: person.role,
    });
  }

  return {
    accountId,
    people,
  };
}

async function seedFamilyCamp(
  client: PoolClient,
) {
  const familyCampSeed =
    createFamilyCampSeed();
  const familyCampActivities =
    familyCampSeed.activities;
  const familyCampSchedule =
    familyCampSeed.schedule;
  const familyCampMeals =
    familyCampSeed.meals;

  await clearPeopleAndEvents(
    client,
  );

  await seedFixedTypes(client);

  const activityIds =
    new Map<string, string>();

  for (
    const activity
    of familyCampActivities
  ) {
    activityIds.set(
      activity.name,
      await ensureActivity(
        client,
        activity,
      ),
    );
  }

  const qualificationIds =
    new Map<string, string>();

  const qualificationNames:
    string[] =
    Array.from(
      new Set<string>(
        familyCampSeed.staff.flatMap(
          (staff) =>
            staff.qualifications,
        ),
      ),
    );

  for (
    const name
    of qualificationNames
  ) {
    const result =
      await client.query<{
        id: string;
      }>(
        `
          INSERT INTO qualifications (
            name
          )
          VALUES ($1)
          ON CONFLICT (name)
          DO UPDATE SET
            name = EXCLUDED.name
          RETURNING id
        `,
        [name],
      );

    qualificationIds.set(
      name,
      result.rows[0].id,
    );
  }

  const staffByUsername =
    new Map<
      string,
      {
        accountId: string;
        staffMemberId: string;
      }
    >();

  for (
    const staff
    of familyCampSeed.staff
  ) {
    const record =
      await ensureStaff(
        client,
        {
          username:
            staff.username,
          fullName:
            staff.full_name,
          babysittingEligible:
            staff.babysitting_eligible,
        },
      );

    staffByUsername.set(
      staff.username,
      record,
    );

    for (
      const qualification
      of staff.qualifications
    ) {
      const qualificationId =
        qualificationIds.get(
          qualification,
        );

      if (!qualificationId) {
        throw new Error(
          `Missing qualification: ${qualification}`,
        );
      }

      await client.query(
        `
          INSERT INTO staff_qualifications (
            staff_member_id,
            qualification_id
          )
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `,
        [
          record.staffMemberId,
          qualificationId,
        ],
      );
    }
  }

  const waterskiQualificationId =
    qualificationIds.get(
      "Waterskiing",
    );

  if (waterskiQualificationId) {
    for (
      const activity
      of familyCampActivities
    ) {
      if (
        !activity.name.includes(
          "Waterski",
        )
      ) {
        continue;
      }

      await client.query(
        `
          INSERT INTO activity_qualifications (
            activity_id,
            qualification_id,
            required_staff_count
          )
          VALUES ($1, $2, 1)
          ON CONFLICT (
            activity_id,
            qualification_id
          )
          DO UPDATE SET
            required_staff_count = 1
        `,
        [
          activityIds.get(
            activity.name,
          ),
          waterskiQualificationId,
        ],
      );
    }
  }

  const familyCampType =
    await client.query<{
      id: string;
    }>(
      `
        SELECT id
        FROM event_types
        WHERE name = $1
        LIMIT 1
      `,
      [
        familyCampSeed.event.event_type,
      ],
    );

  const eventResult =
    await client.query<{
      id: string;
    }>(
      `
        INSERT INTO events (
          name,
          event_type_id,
          starts_at,
          ends_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4
        )
        RETURNING id
      `,
      [
        familyCampSeed.event.name,
        familyCampType.rows[0].id,
        familyCampSeed.event.starts_at,
        familyCampSeed.event.ends_at,
      ],
    );

  const eventId =
    eventResult.rows[0].id;

  const scheduled =
    new Map<
      string,
      Array<{
        id: string;
        startsAt: string;
      }>
    >();

  for (
    const scheduleItem
    of familyCampSchedule
  ) {
    const activityId =
      activityIds.get(
        scheduleItem.activity,
      );

    if (!activityId) {
      throw new Error(
        `Missing activity: ${scheduleItem.activity}`,
      );
    }

    const result =
      await client.query<{
        id: string;
      }>(
        `
          INSERT INTO event_activities (
            event_id,
            activity_id,
            starts_at,
            ends_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4
          )
          RETURNING id
        `,
        [
          eventId,
          activityId,
          scheduleItem.starts_at,
          scheduleItem.ends_at,
        ],
      );

    const item = {
      id: result.rows[0].id,
      startsAt:
        scheduleItem.starts_at,
    };

    scheduled.set(
      scheduleItem.activity,
      [
        ...(
          scheduled.get(
            scheduleItem.activity,
          ) ?? []
        ),
        item,
      ],
    );

    for (
      const staffUsername
      of scheduleItem.staff
    ) {
      const staff =
        staffByUsername.get(
          staffUsername,
        );

      if (!staff) {
        throw new Error(
          `Missing staff account: ${staffUsername}`,
        );
      }

      await client.query(
        `
          INSERT INTO event_activity_staff (
            event_activity_id,
            staff_member_id
          )
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `,
        [
          item.id,
          staff.staffMemberId,
        ],
      );
    }
  }

  const familyCampMenuId =
    await seedMenu(
      client,
      familyCampMenuSeed,
    );

  await client.query(
    `
      UPDATE events
      SET meal_menu_id = $1
      WHERE id = $2
    `,
    [familyCampMenuId, eventId],
  );

  for (const item of familyCampSeed.after_hours_food) {
    await client.query(
      `
        INSERT INTO meal_items (
          name,
          description,
          dietary_notes
        )
        SELECT $1, $2, NULL
        WHERE NOT EXISTS (
          SELECT 1
          FROM meal_items mi
          WHERE LOWER(mi.name) = LOWER($1)
        )
      `,
      [item.name, item.description],
    );

    const libraryItem = await client.query<{ id: string }>(
      `
        SELECT id
        FROM meal_items
        WHERE LOWER(name) = LOWER($1)
        ORDER BY id
        LIMIT 1
      `,
      [item.name],
    );

    await client.query(
      `
        INSERT INTO event_food_offerings (
          event_id,
          item_id,
          offering_type,
          sort_order,
          available
        )
        VALUES (
          $1,
          $2,
          'AFTER_HOURS',
          COALESCE((
            SELECT MAX(sort_order) + 10
            FROM event_food_offerings
            WHERE event_id = $1
              AND offering_type = 'AFTER_HOURS'
          ), 10),
          TRUE
        )
        ON CONFLICT (event_id, offering_type, item_id)
        DO UPDATE SET available = TRUE
      `,
      [eventId, libraryItem.rows[0].id],
    );
  }

  for (
    const meal
    of familyCampMeals
  ) {
    const mealType =
      await client.query<{
        id: string;
      }>(
        `
          SELECT id
          FROM meal_types
          WHERE name = $1
          LIMIT 1
        `,
        [
          meal.meal_type,
        ],
      );

    await client.query(
      `
        INSERT INTO event_meals (
          event_id,
          meal_type_id,
          title,
          starts_at,
          ends_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5
        )
      `,
      [
        eventId,
        mealType.rows[0].id,
        meal.title,
        meal.starts_at,
        meal.ends_at,
      ],
    );
  }

  const householdByUsername =
    new Map<
      string,
      {
        accountId: string;
        people: Array<{
          id: string;
          fullName: string;
          role: string;
        }>;
      }
    >();

  for (
    const household
    of familyCampSeed.households
  ) {
    const record =
      await ensureMemberHousehold(
        client,
        {
          username:
            household.username,
          displayName:
            household.display_name,
          people:
            household.people.map(
              (person) => ({
                fullName:
                  person.full_name,
                role:
                  person.role,
                email:
                  "email" in person
                    ? person.email
                    : null,
                dietary:
                  "dietary_restrictions" in
                  person
                    ? person.dietary_restrictions
                    : null,
              }),
            ),
        },
      );

    householdByUsername.set(
      household.username,
      record,
    );
  }

  const cabinIds =
    new Map<string, string>();

  for (
    const cabin
    of familyCampSeed.cabins
  ) {
    cabinIds.set(
      cabin.name,
      await ensureCabin(
        client,
        {
          name: cabin.name,
          mapSlotId: cabin.map_slot_id,
        },
      ),
    );
  }

  const registrationIds =
    new Map<string, string>();

  for (
    const household
    of familyCampSeed.households
  ) {
    const account =
      householdByUsername.get(
        household.username,
      );

    if (!account) {
      throw new Error(
        `Missing household: ${household.username}`,
      );
    }

    const result =
      await client.query<{
        id: string;
      }>(
        `
          INSERT INTO event_registrations (
            account_id,
            event_id,
            spots_paid_for,
            cabin_id
          )
          VALUES (
            $1,
            $2,
            $3,
            $4
          )
          RETURNING id
        `,
        [
          account.accountId,
          eventId,
          household.spots_paid_for,
          cabinIds.get(
            household.cabin,
          ) ?? null,
        ],
      );

    registrationIds.set(
      household.username,
      result.rows[0].id,
    );
  }

  const attendeeIds =
    new Map<string, string>();

  for (
    const household
    of householdByUsername.values()
  ) {
    for (
      const person
      of household.people
    ) {
      const result =
        await client.query<{
          id: string;
        }>(
          `
            INSERT INTO member_attendees (
              member_id,
              event_id
            )
            VALUES ($1, $2)
            RETURNING id
          `,
          [
            person.id,
            eventId,
          ],
        );

      attendeeIds.set(
        person.fullName,
        result.rows[0].id,
      );
    }
  }

  for (
    const [username, household]
    of householdByUsername.entries()
  ) {
    const registrationId =
      registrationIds.get(
        username,
      );

    const defaultLead =
      household.people.find(
        (person) =>
          person.role === "primary",
      ) ??
      household.people.find(
        (person) =>
          person.role === "adult",
      );

    if (
      registrationId &&
      defaultLead
    ) {
      const leadAttendee =
        await client.query<{
          id: string;
        }>(
          `
            SELECT id
            FROM member_attendees
            WHERE member_id = $1
              AND event_id = $2
          `,
          [
            defaultLead.id,
            eventId,
          ],
        );

      if (leadAttendee.rows[0]) {
        await client.query(
          `
            UPDATE event_registrations
            SET household_lead_attendee_id = $2
            WHERE id = $1
          `,
          [
            registrationId,
            leadAttendee.rows[0].id,
          ],
        );
      }
    }
  }

  for (
    const signup
    of familyCampSeed.activity_signups
  ) {
    const activity =
      scheduled.get(
        signup.activity,
      )?.[0];

    const attendeeId =
      attendeeIds.get(
        signup.person,
      );

    if (!activity) {
      throw new Error(
        `Missing scheduled activity: ${signup.activity}`,
      );
    }

    if (!attendeeId) {
      throw new Error(
        `Missing attendee: ${signup.person}`,
      );
    }

    await client.query(
      `
        INSERT INTO event_activity_signups (
          event_activity_id,
          member_attendee_id
        )
        VALUES ($1, $2)
      `,
      [
        activity.id,
        attendeeId,
      ],
    );
  }

  for (
    const request
    of familyCampSeed.babysitting
  ) {
    const registrationId =
      registrationIds.get(
        request.household,
      );

    const household =
      householdByUsername.get(
        request.household,
      );

    const sitter =
      staffByUsername.get(
        request.staff,
      );

    const member =
      household?.people.find(
        (person) =>
          person.fullName ===
          request.member,
      );

    if (
      !registrationId ||
      !member ||
      !sitter
    ) {
      throw new Error(
        `Invalid babysitting seed for ${request.household}`,
      );
    }

    const babysitting =
      await client.query<{
        id: string;
      }>(
        `
          INSERT INTO babysitting_requests (
            event_registration_id,
            sitter_staff_member_id,
            starts_at,
            ends_at,
            status,
            notes
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
          RETURNING id
        `,
        [
          registrationId,
          sitter.staffMemberId,
          request.starts_at,
          request.ends_at,
          request.status,
          request.notes,
        ],
      );

    await client.query(
      `
        INSERT INTO babysitting_request_members (
          babysitting_request_id,
          member_id
        )
        VALUES ($1, $2)
      `,
      [
        babysitting.rows[0].id,
        member.id,
      ],
    );
  }

  for (
    const notification
    of familyCampSeed.notifications
  ) {
    for (
      const username
      of notification.targets
    ) {
      const household =
        householdByUsername.get(
          username,
        );

      if (!household) {
        throw new Error(
          `Missing notification target: ${username}`,
        );
      }

      await client.query(
        `
          INSERT INTO notifications (
            account_id,
            event_id,
            kind,
            title,
            body
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5
          )
        `,
        [
          household.accountId,
          eventId,
          notification.kind,
          notification.title,
          notification.body,
        ],
      );
    }
  }

  await recordDemoAction(
    client,
    "seed-family-camp",
    {
      event:
        familyCampSeed.event.name,
      dates:
        `${familyCampSeed.event.starts_at} through ${familyCampSeed.event.ends_at}`,
      households:
        familyCampSeed.households.map(
          (household) =>
            household.display_name,
        ),
      staff:
        familyCampSeed.staff.map(
          (staff) =>
            staff.full_name,
        ),
      activities:
        familyCampSchedule.length,
      meals:
        familyCampMeals.length,
    },
  );

  return {
    eventId,
    accounts: {
      members:
        familyCampSeed.households.map(
          (household) =>
            household.username,
        ),
      staff:
        familyCampSeed.staff.map(
          (staff) =>
            staff.username,
        ),
    },
  };
}

devRouter.post(
  "/demo/:mode",
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
  async (req, res) => {
    const mode =
      String(
        req.params.mode,
      ) as DemoMode;

    if (
      ![
        "clear-people-events",
        "clear-guests-events",
        "seed-family-camp",
      ].includes(mode)
    ) {
      res.status(404).json({
        error:
          "Unknown demo action",
      });
      return;
    }

    try {
      const result =
        await inTransaction(
          async (client) => {
            if (
              mode ===
              "clear-people-events"
            ) {
              await clearPeopleAndEvents(
                client,
              );

              return {
                mode,
                message:
                  "Staff, members, and events cleared. Admin and reusable setup retained.",
              };
            }

            if (
              mode ===
              "clear-guests-events"
            ) {
              await clearGuestsAndEvents(
                client,
              );

              return {
                mode,
                message:
                  "Members and events cleared. Admin, staff, and reusable setup retained.",
              };
            }

            const seeded =
              await seedFamilyCamp(
                client,
              );

            return {
              mode,
              message:
                "Family Camp 2026 demo loaded.",
              ...seeded,
            };
          },
        );

      res.json(result);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Demo action failed",
      });
    }
  },
);
