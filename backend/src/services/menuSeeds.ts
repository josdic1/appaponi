import type {
  PoolClient,
} from "pg";

export type MenuSeedItem = {
  name: string;
  meal_type?: string | null;
  day_of_week?: number | null;
  description?: string | null;
  dietary_notes?: string | null;
  sort_order?: number;
};

export type MenuSeed = {
  key?: string;
  name: string;
  description?: string | null;
  items: MenuSeedItem[];
};

function assertMenuSeed(seed: MenuSeed) {
  if (!seed.name?.trim()) {
    throw new Error("Menu seed needs a name");
  }

  if (!Array.isArray(seed.items)) {
    throw new Error("Menu seed needs an items array");
  }

  for (const [index, item] of seed.items.entries()) {
    if (!item.name?.trim()) {
      throw new Error(`Menu item ${index + 1} needs a name`);
    }

    if (
      item.day_of_week != null &&
      (!Number.isInteger(item.day_of_week) ||
        item.day_of_week < 0 ||
        item.day_of_week > 6)
    ) {
      throw new Error(
        `Menu item ${index + 1} has invalid day_of_week`,
      );
    }
  }
}

export async function seedMenu(
  client: PoolClient,
  seed: MenuSeed,
) {
  assertMenuSeed(seed);

  const menuResult = await client.query<{
    id: string;
  }>(
    `
      INSERT INTO meal_menus (
        name,
        description
      )
      VALUES ($1, $2)
      ON CONFLICT (name)
      DO UPDATE SET
        description = EXCLUDED.description,
        updated_at = NOW()
      RETURNING id
    `,
    [
      seed.name.trim(),
      seed.description?.trim() || null,
    ],
  );

  const menuId = menuResult.rows[0].id;

  await client.query(
    `
      DELETE FROM meal_menu_items
      WHERE menu_id = $1
    `,
    [menuId],
  );

  const mealTypeIds = new Map<string, string>();

  for (const item of seed.items) {
    let mealTypeId: string | null = null;

    if (item.meal_type) {
      const cached = mealTypeIds.get(item.meal_type);

      if (cached) {
        mealTypeId = cached;
      } else {
        const result = await client.query<{ id: string }>(
          `
            SELECT id
            FROM meal_types
            WHERE name = $1
            LIMIT 1
          `,
          [item.meal_type],
        );

        if (!result.rows[0]) {
          throw new Error(
            `Unknown meal type in menu seed: ${item.meal_type}`,
          );
        }

        mealTypeId = result.rows[0].id;
        mealTypeIds.set(item.meal_type, mealTypeId);
      }
    }

    const name = item.name.trim();
    const description = item.description?.trim() || null;
    const dietaryNotes = item.dietary_notes?.trim() || null;

    const insertedItem = await client.query<{ id: string }>(
      `
        INSERT INTO meal_items (
          name,
          description,
          dietary_notes
        )
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        RETURNING id
      `,
      [name, description, dietaryNotes],
    );

    let itemId = insertedItem.rows[0]?.id;

    if (!itemId) {
      const existingItem = await client.query<{ id: string }>(
        `
          SELECT id
          FROM meal_items
          WHERE LOWER(name) = LOWER($1)
            AND COALESCE(LOWER(description), '') =
                COALESCE(LOWER($2::text), '')
            AND COALESCE(LOWER(dietary_notes), '') =
                COALESCE(LOWER($3::text), '')
          LIMIT 1
        `,
        [name, description, dietaryNotes],
      );

      itemId = existingItem.rows[0]?.id;
    }

    if (!itemId) {
      throw new Error(`Could not seed menu item: ${name}`);
    }

    await client.query(
      `
        INSERT INTO meal_menu_items (
          menu_id,
          item_id,
          meal_type_id,
          day_of_week,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        menuId,
        itemId,
        mealTypeId,
        item.day_of_week ?? null,
        item.sort_order ?? 0,
      ],
    );
  }

  return menuId;
}
