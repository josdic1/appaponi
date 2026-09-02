import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

type Row = Record<string, unknown>;

type TableSummary = {
  name: string;
  row_count: number;
};

type FormAction =
  | "show"
  | "add"
  | "update"
  | "delete";

type FieldKind =
  | "text"
  | "password"
  | "number"
  | "textarea"
  | "select"
  | "lookup"
  | "multi-lookup"
  | "boolean"
  | "datetime";

type FormField = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  nullable?: boolean;
  options?: string[];
  lookup?: string;
  filter?: (
    row: Row,
  ) => boolean;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
};

type FormResource = {
  key: string;
  label: string;
  singular: string;
  group: string;
  table: string;
  endpoint: string;
  addFields?: FormField[];
  updateFields?: FormField[];
  canDelete?: boolean;
};

const accountLookup: FormField = {
  key: "account_id",
  label: "Account",
  kind: "lookup",
  lookup: "accounts",
  required: true,
};

const memberAccountLookup: FormField = {
  ...accountLookup,
  label: "Household account",
  filter: (row) =>
    row.account_type === "member",
};

const staffAccountLookup: FormField = {
  ...accountLookup,
  label: "Staff account",
  filter: (row) =>
    row.account_type === "staff",
};

const areaLookup: FormField = {
  key: "area_id",
  label: "Area",
  kind: "lookup",
  lookup: "areas",
  required: true,
};

const nullableAreaLookup: FormField = {
  ...areaLookup,
  required: false,
  nullable: true,
};

const eventLookup: FormField = {
  key: "event_id",
  label: "Event",
  kind: "lookup",
  lookup: "events",
  required: true,
};

const staffLookup: FormField = {
  key: "staff_member_id",
  label: "Staff member",
  kind: "lookup",
  lookup: "staff_members",
  required: true,
};

const resources: FormResource[] = [
  {
    key: "accounts",
    label: "Accounts",
    singular: "Account",
    group: "People",
    table: "accounts",
    endpoint: "/api/accounts",
    addFields: [
      {
        key: "username",
        label: "Username",
        kind: "text",
        required: true,
      },
      {
        key: "password",
        label: "Temporary password",
        kind: "password",
        required: true,
      },
      {
        key: "account_type",
        label: "Account type",
        kind: "select",
        options: [
          "member",
          "staff",
          "admin",
        ],
        required: true,
      },
    ],
    updateFields: [
      {
        key: "username",
        label: "Username",
        kind: "text",
        required: true,
      },
    ],
  },
  {
    key: "household_members",
    label: "Household Members",
    singular: "Household Member",
    group: "People",
    table: "household_members",
    endpoint: "/api/household-members",
    addFields: [
      memberAccountLookup,
      {
        key: "full_name",
        label: "Full name",
        kind: "text",
        required: true,
      },
      {
        key: "email",
        label: "Email",
        kind: "text",
      },
      {
        key: "phone",
        label: "Phone",
        kind: "text",
      },
      {
        key: "dietary_restrictions",
        label: "Dietary restrictions",
        kind: "textarea",
      },
      {
        key: "member_role",
        label: "Role",
        kind: "select",
        options: [
          "primary",
          "adult",
          "child",
        ],
        required: true,
      },
    ],
    updateFields: [
      {
        key: "full_name",
        label: "Full name",
        kind: "text",
        required: true,
      },
      {
        key: "email",
        label: "Email",
        kind: "text",
        nullable: true,
      },
      {
        key: "phone",
        label: "Phone",
        kind: "text",
        nullable: true,
      },
      {
        key: "dietary_restrictions",
        label: "Dietary restrictions",
        kind: "textarea",
        nullable: true,
      },
    ],
  },
  {
    key: "staff_members",
    label: "Staff Members",
    singular: "Staff Member",
    group: "People",
    table: "staff_members",
    endpoint: "/api/staff-members",
    addFields: [
      staffAccountLookup,
      {
        key: "full_name",
        label: "Full name",
        kind: "text",
        required: true,
      },
      {
        key: "email",
        label: "Email",
        kind: "text",
      },
      {
        key: "phone",
        label: "Phone",
        kind: "text",
      },
      {
        key: "role",
        label: "Role",
        kind: "select",
        options: ["staff", "manager"],
        required: true,
      },
      {
        key: "babysitting_eligible",
        label: "Babysitting eligible",
        kind: "boolean",
      },
    ],
    updateFields: [
      {
        key: "full_name",
        label: "Full name",
        kind: "text",
        required: true,
      },
      {
        key: "email",
        label: "Email",
        kind: "text",
        nullable: true,
      },
      {
        key: "phone",
        label: "Phone",
        kind: "text",
        nullable: true,
      },
      {
        key: "role",
        label: "Role",
        kind: "select",
        options: ["staff", "manager"],
        required: true,
      },
      {
        key: "babysitting_eligible",
        label: "Babysitting eligible",
        kind: "boolean",
      },
    ],
    canDelete: true,
  },
  {
    key: "events",
    label: "Events",
    singular: "Event",
    group: "Events",
    table: "events",
    endpoint: "/api/events",
    addFields: [
      {
        key: "name",
        label: "Event name",
        kind: "text",
        required: true,
      },
      {
        key: "event_type_id",
        label: "Event type",
        kind: "lookup",
        lookup: "event_types",
        required: true,
      },
      {
        key: "starts_at",
        label: "Starts",
        kind: "datetime",
        required: true,
      },
      {
        key: "ends_at",
        label: "Ends",
        kind: "datetime",
        required: true,
      },
      {
        key: "other_value",
        label: "Other type value",
        kind: "text",
      },
      {
        key: "other_reason",
        label: "Other type reason",
        kind: "textarea",
      },
    ],
  },
  {
    key: "event_registrations",
    label: "Registrations",
    singular: "Registration",
    group: "Events",
    table: "event_registrations",
    endpoint: "/api/registrations",
    addFields: [
      memberAccountLookup,
      eventLookup,
      {
        key: "spots_paid_for",
        label: "Paid spots",
        kind: "number",
        required: true,
        min: 1,
        step: 1,
      },
    ],
    updateFields: [
      {
        key: "spots_paid_for",
        label: "Paid spots",
        kind: "number",
        required: true,
        min: 1,
        step: 1,
      },
      {
        key: "cabin_id",
        label: "Cabin",
        kind: "lookup",
        lookup: "cabins",
        nullable: true,
      },
    ],
  },
  {
    key: "areas",
    label: "Areas",
    singular: "Area",
    group: "Camp",
    table: "areas",
    endpoint: "/api/areas",
    addFields: [
      {
        key: "name",
        label: "Area name",
        kind: "text",
        required: true,
      },
      {
        key: "map_x",
        label: "Map X",
        kind: "number",
        nullable: true,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: "map_y",
        label: "Map Y",
        kind: "number",
        nullable: true,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
    updateFields: [
      {
        key: "name",
        label: "Area name",
        kind: "text",
        required: true,
      },
      {
        key: "map_x",
        label: "Map X",
        kind: "number",
        nullable: true,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: "map_y",
        label: "Map Y",
        kind: "number",
        nullable: true,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
    canDelete: true,
  },
  {
    key: "cabins",
    label: "Cabins",
    singular: "Cabin",
    group: "Camp",
    table: "cabins",
    endpoint: "/api/cabins",
    addFields: [
      {
        key: "name",
        label: "Cabin name",
        kind: "text",
        required: true,
      },
      nullableAreaLookup,
      {
        key: "map_x",
        label: "Map X",
        kind: "number",
        nullable: true,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: "map_y",
        label: "Map Y",
        kind: "number",
        nullable: true,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
    updateFields: [
      {
        key: "name",
        label: "Cabin name",
        kind: "text",
        required: true,
      },
      nullableAreaLookup,
      {
        key: "map_x",
        label: "Map X",
        kind: "number",
        nullable: true,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: "map_y",
        label: "Map Y",
        kind: "number",
        nullable: true,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
    canDelete: true,
  },
  {
    key: "activities",
    label: "Activities",
    singular: "Activity",
    group: "Camp",
    table: "activities",
    endpoint: "/api/activities",
    addFields: [
      {
        key: "name",
        label: "Activity name",
        kind: "text",
        required: true,
      },
      areaLookup,
      {
        key: "setting",
        label: "Setting",
        kind: "select",
        options: [
          "inside",
          "outside",
          "other",
        ],
        required: true,
      },
    ],
  },
  {
    key: "qualifications",
    label: "Qualifications",
    singular: "Qualification",
    group: "Schedule",
    table: "qualifications",
    endpoint: "/api/qualifications",
    addFields: [
      {
        key: "name",
        label: "Qualification name",
        kind: "text",
        required: true,
      },
    ],
  },
  {
    key: "staff_member_areas",
    label: "Staff Areas",
    singular: "Staff Area Assignment",
    group: "Schedule",
    table: "staff_member_areas",
    endpoint: "/api/scheduling/staff-areas",
    addFields: [
      staffLookup,
      areaLookup,
    ],
  },
  {
    key: "staff_qualifications",
    label: "Staff Qualifications",
    singular: "Staff Qualification",
    group: "Schedule",
    table: "staff_qualifications",
    endpoint: "/api/scheduling/staff-qualifications",
    addFields: [
      staffLookup,
      {
        key: "qualification_id",
        label: "Qualification",
        kind: "lookup",
        lookup: "qualifications",
        required: true,
      },
    ],
  },
  {
    key: "activity_qualifications",
    label: "Activity Qualifications",
    singular: "Activity Qualification",
    group: "Schedule",
    table: "activity_qualifications",
    endpoint: "/api/scheduling/activity-qualifications",
    addFields: [
      {
        key: "activity_id",
        label: "Activity",
        kind: "lookup",
        lookup: "activities",
        required: true,
      },
      {
        key: "qualification_id",
        label: "Qualification",
        kind: "lookup",
        lookup: "qualifications",
        required: true,
      },
      {
        key: "required_staff_count",
        label: "Required staff",
        kind: "number",
        required: true,
        min: 1,
        step: 1,
      },
    ],
  },
  {
    key: "event_activities",
    label: "Scheduled Activities",
    singular: "Scheduled Activity",
    group: "Schedule",
    table: "event_activities",
    endpoint: "/api/scheduling/event-activities",
    addFields: [
      eventLookup,
      {
        key: "activity_id",
        label: "Activity",
        kind: "lookup",
        lookup: "activities",
        required: true,
      },
      {
        key: "starts_at",
        label: "Starts",
        kind: "datetime",
        required: true,
      },
      {
        key: "ends_at",
        label: "Ends",
        kind: "datetime",
        required: true,
      },
      {
        key: "capacity",
        label: "Capacity",
        kind: "number",
        nullable: true,
        min: 1,
        step: 1,
      },
    ],
  },
  {
    key: "event_activity_staff",
    label: "Activity Staff",
    singular: "Activity Staff Assignment",
    group: "Schedule",
    table: "event_activity_staff",
    endpoint: "/api/scheduling/event-activity-staff",
    addFields: [
      {
        key: "event_activity_id",
        label: "Scheduled activity",
        kind: "lookup",
        lookup: "event_activities",
        required: true,
      },
      staffLookup,
    ],
  },
  {
    key: "meal_menus",
    label: "Meal Menus",
    singular: "Meal Menu",
    group: "Services",
    table: "meal_menus",
    endpoint: "/api/meals/menus",
    addFields: [
      {
        key: "name",
        label: "Menu name",
        kind: "text",
        required: true,
      },
      {
        key: "description",
        label: "Description",
        kind: "textarea",
      },
    ],
  },
  {
    key: "meal_menu_items",
    label: "Meal Menu Items",
    singular: "Meal Menu Item",
    group: "Services",
    table: "meal_menu_items",
    endpoint: "/api/meals/menu-items",
    addFields: [
      {
        key: "menu_id",
        label: "Menu",
        kind: "lookup",
        lookup: "meal_menus",
        required: true,
      },
      {
        key: "name",
        label: "Item name",
        kind: "text",
        required: true,
      },
      {
        key: "description",
        label: "Description",
        kind: "textarea",
      },
      {
        key: "dietary_notes",
        label: "Dietary notes",
        kind: "textarea",
      },
      {
        key: "sort_order",
        label: "Sort order",
        kind: "number",
        step: 1,
      },
    ],
  },
  {
    key: "event_meals",
    label: "Event Meals",
    singular: "Event Meal",
    group: "Services",
    table: "event_meals",
    endpoint: "/api/meals/event-meals",
    addFields: [
      eventLookup,
      {
        key: "meal_type_id",
        label: "Meal type",
        kind: "lookup",
        lookup: "meal_types",
        required: true,
      },
      {
        key: "menu_id",
        label: "Menu",
        kind: "lookup",
        lookup: "meal_menus",
        nullable: true,
      },
      {
        key: "title",
        label: "Title",
        kind: "text",
      },
      {
        key: "notes",
        label: "Notes",
        kind: "textarea",
      },
      {
        key: "starts_at",
        label: "Starts",
        kind: "datetime",
        required: true,
      },
      {
        key: "ends_at",
        label: "Ends",
        kind: "datetime",
        required: true,
      },
    ],
  },
  {
    key: "after_hours_items",
    label: "After-hours Items",
    singular: "After-hours Item",
    group: "Services",
    table: "after_hours_items",
    endpoint: "/api/after-hours/items",
    addFields: [
      {
        key: "name",
        label: "Item name",
        kind: "text",
        required: true,
      },
      {
        key: "description",
        label: "Description",
        kind: "textarea",
      },
    ],
  },
  {
    key: "after_hours_orders",
    label: "After-hours Orders",
    singular: "After-hours Order",
    group: "Services",
    table: "after_hours_orders",
    endpoint: "/api/after-hours/orders",
    updateFields: [
      {
        key: "assigned_staff_member_id",
        label: "Assigned staff",
        kind: "lookup",
        lookup: "staff_members",
        nullable: true,
      },
      {
        key: "status",
        label: "Status",
        kind: "select",
        options: [
          "open",
          "fulfilled",
          "cancelled",
        ],
        required: true,
      },
    ],
  },
  {
    key: "babysitting_requests",
    label: "Babysitting Requests",
    singular: "Babysitting Request",
    group: "Services",
    table: "babysitting_requests",
    endpoint: "/api/babysitting",
    addFields: [
      {
        key: "event_registration_id",
        label: "Registration",
        kind: "lookup",
        lookup: "event_registrations",
        required: true,
      },
      {
        key: "starts_at",
        label: "Starts",
        kind: "datetime",
        required: true,
      },
      {
        key: "ends_at",
        label: "Ends",
        kind: "datetime",
        required: true,
      },
      {
        key: "notes",
        label: "Notes",
        kind: "textarea",
      },
      {
        key: "member_ids",
        label: "Members",
        kind: "multi-lookup",
        lookup: "household_members",
        required: true,
        help: "Choose everyone included in this request.",
      },
    ],
    updateFields: [
      {
        key: "sitter_staff_member_id",
        label: "Sitter",
        kind: "lookup",
        lookup: "staff_members",
        nullable: true,
      },
      {
        key: "status",
        label: "Status",
        kind: "select",
        options: [
          "pending",
          "confirmed",
          "completed",
          "cancelled",
        ],
        required: true,
      },
    ],
  },
  {
    key: "notifications",
    label: "Notifications",
    singular: "Notification",
    group: "Services",
    table: "notifications",
    endpoint: "/api/notifications",
    addFields: [
      accountLookup,
      {
        key: "event_id",
        label: "Event",
        kind: "lookup",
        lookup: "events",
        nullable: true,
      },
      {
        key: "kind",
        label: "Kind",
        kind: "select",
        options: [
          "activity",
          "meal",
          "special",
          "general",
        ],
        required: true,
      },
      {
        key: "title",
        label: "Title",
        kind: "text",
        required: true,
      },
      {
        key: "body",
        label: "Message",
        kind: "textarea",
        required: true,
      },
      {
        key: "scheduled_for",
        label: "Scheduled for",
        kind: "datetime",
        nullable: true,
      },
    ],
  },
];

async function readJson<T>(
  response: Response,
): Promise<T> {
  const text = await response.text();

  let data: unknown = {};

  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Request failed with ${response.status}`,
      );
    }
  }

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data
        ? String(
            (data as { error: unknown })
              .error,
          )
        : "Request failed";

    throw new Error(message);
  }

  return data as T;
}

function rowLabel(
  row: Row | undefined,
) {
  if (!row) {
    return "—";
  }

  const preferred = [
    "full_name",
    "name",
    "username",
    "title",
    "event_name",
    "activity_name",
  ];

  for (const key of preferred) {
    const value = row[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value;
    }
  }

  return row.id
    ? `#${String(row.id)}`
    : "Record";
}

function humanize(key: string) {
  return key
    .replace(/_id$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    );
}

function displayValue(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function toLocalDateTime(value: unknown) {
  if (
    typeof value !== "string" ||
    !value
  ) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset =
    date.getTimezoneOffset() * 60_000;

  return new Date(
    date.getTime() - offset,
  )
    .toISOString()
    .slice(0, 16);
}

function initialValue(
  field: FormField,
  row?: Row | null,
): string | boolean | string[] {
  const value = row?.[field.key];

  if (field.kind === "boolean") {
    return Boolean(value);
  }

  if (field.kind === "multi-lookup") {
    return Array.isArray(value)
      ? value.map(String)
      : [];
  }

  if (field.kind === "datetime") {
    return toLocalDateTime(value);
  }

  if (
    value === null ||
    value === undefined
  ) {
    if (
      field.kind === "select" &&
      field.options?.length &&
      field.required
    ) {
      return field.options[0];
    }

    return "";
  }

  return String(value);
}

function makeValues(
  fields: FormField[],
  row?: Row | null,
) {
  const next: Record<
    string,
    string | boolean | string[]
  > = {};

  for (const field of fields) {
    next[field.key] =
      initialValue(field, row);
  }

  return next;
}

function serialize(
  fields: FormField[],
  values: Record<
    string,
    string | boolean | string[]
  >,
) {
  const body: Record<string, unknown> = {};

  for (const field of fields) {
    const value = values[field.key];

    if (field.kind === "boolean") {
      body[field.key] = Boolean(value);
      continue;
    }

    if (field.kind === "multi-lookup") {
      const list = Array.isArray(value)
        ? value
        : [];

      if (!list.length && !field.required) {
        continue;
      }

      body[field.key] =
        list.map(Number);
      continue;
    }

    const text = String(value ?? "").trim();

    if (!text) {
      if (field.nullable) {
        body[field.key] = null;
      }

      continue;
    }

    if (
      field.kind === "number" ||
      field.kind === "lookup"
    ) {
      body[field.key] = Number(text);
      continue;
    }

    if (field.kind === "datetime") {
      body[field.key] =
        new Date(text).toISOString();
      continue;
    }

    body[field.key] = text;
  }

  return body;
}

export default function FormsView() {
  const [tables, setTables] =
    useState<TableSummary[]>([]);

  const [resourceKey, setResourceKey] =
    useState(resources[0].key);

  const [action, setAction] =
    useState<FormAction>("show");

  const [rows, setRows] =
    useState<Row[]>([]);

  const [selectedId, setSelectedId] =
    useState("");

  const [lookups, setLookups] =
    useState<Record<string, Row[]>>({});

  const [values, setValues] =
    useState<
      Record<
        string,
        string | boolean | string[]
      >
    >({});

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const resource =
    resources.find(
      (item) => item.key === resourceKey,
    ) ?? resources[0];

  const selectedRow =
    rows.find(
      (row) =>
        String(row.id) === selectedId,
    ) ?? null;

  const availableResources = useMemo(() => {
    const live = new Set(
      tables.map((table) => table.name),
    );

    return resources.filter((item) =>
      live.has(item.table),
    );
  }, [tables]);

  const groups = useMemo(
    () =>
      Array.from(
        new Set(
          availableResources.map(
            (item) => item.group,
          ),
        ),
      ),
    [availableResources],
  );

  const supportedActions = useMemo(() => {
    const next: FormAction[] = ["show"];

    if (resource.addFields) {
      next.push("add");
    }

    if (resource.updateFields) {
      next.push("update");
    }

    if (resource.canDelete) {
      next.push("delete");
    }

    return next;
  }, [resource]);

  const fields =
    action === "add"
      ? resource.addFields ?? []
      : action === "update"
        ? resource.updateFields ?? []
        : [];

  function selectedLabel(
    row: Row | null,
  ) {
    if (!row) {
      return "—";
    }

    const direct = rowLabel(row);

    if (!direct.startsWith("#")) {
      return direct;
    }

    const relationshipFields = [
      ...(resource.addFields ?? []),
      ...(resource.updateFields ?? []),
    ].filter(
      (field) =>
        field.kind === "lookup" &&
        field.lookup &&
        row[field.key] !== null &&
        row[field.key] !== undefined,
    );

    const relationshipLabels =
      relationshipFields
        .map((field) => {
          const match =
            lookups[field.lookup!]?.find(
              (item) =>
                String(item.id) ===
                String(row[field.key]),
            );

          return match
            ? rowLabel(match)
            : null;
        })
        .filter(
          (label): label is string =>
            Boolean(label),
        )
        .slice(0, 2);

    return relationshipLabels.length
      ? relationshipLabels.join(" · ")
      : direct;
  }

  async function loadRows(
    table: string,
    limit = 200,
  ) {
    const params =
      new URLSearchParams({
        limit: String(limit),
        offset: "0",
      });

    const response = await fetch(
      `/__appoponi/data/${encodeURIComponent(
        table,
      )}?${params}`,
      { credentials: "include" },
    );

    return readJson<{
      rows: Row[];
      total: number;
    }>(response);
  }

  async function loadTables() {
    const response = await fetch(
      "/__appoponi/data/tables",
      { credentials: "include" },
    );

    const data = await readJson<{
      tables: TableSummary[];
    }>(response);

    setTables(data.tables);
  }

  async function loadResource(
    nextResource = resource,
  ) {
    setError("");

    const data =
      await loadRows(nextResource.table);

    const fieldLookups = [
      ...(nextResource.addFields ?? []),
      ...(nextResource.updateFields ?? []),
    ]
      .map((field) => field.lookup)
      .filter(
        (table): table is string =>
          Boolean(table),
      );

    const lookupTables = Array.from(
      new Set(fieldLookups),
    );

    const nextLookups: Record<
      string,
      Row[]
    > = {};

    await Promise.all(
      lookupTables.map(async (table) => {
        const lookup =
          await loadRows(table, 200);

        nextLookups[table] = lookup.rows;
      }),
    );

    setRows(data.rows);
    setLookups(nextLookups);

    setSelectedId((current) => {
      if (
        current &&
        data.rows.some(
          (row) =>
            String(row.id) === current,
        )
      ) {
        return current;
      }

      return data.rows[0]?.id
        ? String(data.rows[0].id)
        : "";
    });
  }

  useEffect(() => {
    void loadTables()
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Could not load forms",
        ),
      )
      .finally(() =>
        setLoading(false),
      );
  }, []);

  useEffect(() => {
    if (!tables.length) {
      return;
    }

    void loadResource(resource).catch(
      (err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Could not load records",
        ),
    );
  }, [resourceKey, tables.length]);

  useEffect(() => {
    if (!supportedActions.includes(action)) {
      setAction("show");
    }
  }, [resourceKey, supportedActions]);

  useEffect(() => {
    if (action === "add") {
      setValues(
        makeValues(
          resource.addFields ?? [],
        ),
      );
      return;
    }

    if (action === "update") {
      setValues(
        makeValues(
          resource.updateFields ?? [],
          selectedRow,
        ),
      );
    }
  }, [
    action,
    resourceKey,
    selectedId,
  ]);

  useEffect(() => {
    function handleGroup(event: Event) {
      const group =
        (event as CustomEvent<string>)
          .detail;

      const first =
        availableResources.find(
          (item) =>
            item.group === group,
        );

      if (first) {
        setResourceKey(first.key);
        setAction("show");
        setNotice("");
        setError("");
      }
    }

    window.addEventListener(
      "appoponi-builder-data-group",
      handleGroup,
    );

    return () =>
      window.removeEventListener(
        "appoponi-builder-data-group",
        handleGroup,
      );
  }, [availableResources]);

  function lookupLabel(
    table: string,
    row: Row,
  ) {
    if (table === "event_registrations") {
      const account =
        lookups.accounts?.find(
          (item) =>
            String(item.id) ===
            String(row.account_id),
        );

      const event =
        lookups.events?.find(
          (item) =>
            String(item.id) ===
            String(row.event_id),
        );

      if (account || event) {
        return `${rowLabel(
          account,
        )} · ${rowLabel(event)}`;
      }
    }

    return rowLabel(row);
  }

  function fieldDisplay(
    key: string,
    value: unknown,
  ) {
    const field = [
      ...(resource.addFields ?? []),
      ...(resource.updateFields ?? []),
    ].find((item) => item.key === key);

    if (
      field?.lookup &&
      value !== null &&
      value !== undefined
    ) {
      const row =
        lookups[field.lookup]?.find(
          (item) =>
            String(item.id) ===
            String(value),
        );

      if (row) {
        return lookupLabel(
          field.lookup,
          row,
        );
      }
    }

    if (
      typeof value === "string" &&
      (key.endsWith("_at") ||
        key === "starts_at" ||
        key === "ends_at")
    ) {
      const date = new Date(value);

      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString();
      }
    }

    return displayValue(value);
  }

  async function mutate(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      action !== "add" &&
      action !== "update"
    ) {
      return;
    }

    if (
      action === "update" &&
      !selectedId
    ) {
      setError("Choose a record first.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const body = serialize(
        fields,
        values,
      );

      if (
        action === "update" &&
        resource.key ===
          "event_registrations"
      ) {
        await readJson(
          await fetch(
            `${resource.endpoint}/${selectedId}`,
            {
              method: "PATCH",
              credentials: "include",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                spots_paid_for:
                  body.spots_paid_for,
              }),
            },
          ),
        );

        await readJson(
          await fetch(
            `${resource.endpoint}/${selectedId}/cabin`,
            {
              method: "PATCH",
              credentials: "include",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                cabin_id:
                  body.cabin_id ?? null,
              }),
            },
          ),
        );
      } else {
        const url =
          action === "add"
            ? resource.endpoint
            : `${resource.endpoint}/${selectedId}`;

        await readJson(
          await fetch(url, {
            method:
              action === "add"
                ? "POST"
                : "PATCH",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(body),
          }),
        );
      }

      await loadResource(resource);

      setNotice(
        action === "add"
          ? `${resource.singular} added.`
          : `${resource.singular} updated.`,
      );

      if (action === "add") {
        setValues(
          makeValues(
            resource.addFields ?? [],
          ),
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Request failed",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeSelected() {
    if (
      !resource.canDelete ||
      !selectedId ||
      !selectedRow
    ) {
      return;
    }

    if (
      !window.confirm(
        `Delete ${resource.singular.toLowerCase()} “${selectedLabel(
          selectedRow,
        )}”?`,
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await readJson(
        await fetch(
          `${resource.endpoint}/${selectedId}`,
          {
            method: "DELETE",
            credentials: "include",
          },
        ),
      );

      await loadResource(resource);

      setNotice(
        `${resource.singular} deleted.`,
      );
      setAction("show");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Delete failed",
      );
    } finally {
      setSaving(false);
    }
  }

  function renderField(field: FormField) {
    const value =
      values[field.key] ??
      initialValue(field);

    const set = (
      next:
        | string
        | boolean
        | string[],
    ) =>
      setValues((current) => ({
        ...current,
        [field.key]: next,
      }));

    if (field.kind === "boolean") {
      return (
        <label
          className="forms-check"
          key={field.key}
        >
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) =>
              set(event.target.checked)
            }
          />

          <span>{field.label}</span>
        </label>
      );
    }

    if (field.kind === "multi-lookup") {
      const selected =
        Array.isArray(value)
          ? value
          : [];

      const options =
        lookups[field.lookup ?? ""] ?? [];

      return (
        <fieldset
          className="forms-field forms-multi"
          key={field.key}
        >
          <legend>
            {field.label}
            {field.required && (
              <span> required</span>
            )}
          </legend>

          <div className="forms-multi-options">
            {options.map((row) => {
              const id = String(row.id);
              const checked =
                selected.includes(id);

              return (
                <label key={id}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      set(
                        checked
                          ? selected.filter(
                              (item) =>
                                item !== id,
                            )
                          : [
                              ...selected,
                              id,
                            ],
                      )
                    }
                  />

                  <span>
                    {lookupLabel(
                      field.lookup ?? "",
                      row,
                    )}
                  </span>
                </label>
              );
            })}
          </div>

          {field.help && (
            <small>{field.help}</small>
          )}
        </fieldset>
      );
    }

    if (field.kind === "lookup") {
      const options =
        (lookups[field.lookup ?? ""] ?? [])
          .filter((row) =>
            field.filter
              ? field.filter(row)
              : true,
          );

      return (
        <label
          className="forms-field"
          key={field.key}
        >
          <span>
            {field.label}
            {field.required && (
              <b> required</b>
            )}
          </span>

          <select
            value={String(value)}
            required={field.required}
            onChange={(event) =>
              set(event.target.value)
            }
          >
            <option value="">
              {field.nullable
                ? "None"
                : "Choose…"}
            </option>

            {options.map((row) => (
              <option
                key={String(row.id)}
                value={String(row.id)}
              >
                {lookupLabel(
                  field.lookup ?? "",
                  row,
                )}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (field.kind === "select") {
      return (
        <label
          className="forms-field"
          key={field.key}
        >
          <span>
            {field.label}
            {field.required && (
              <b> required</b>
            )}
          </span>

          <select
            value={String(value)}
            required={field.required}
            onChange={(event) =>
              set(event.target.value)
            }
          >
            {!field.required && (
              <option value="">
                Choose…
              </option>
            )}

            {field.options?.map(
              (option) => (
                <option
                  key={option}
                  value={option}
                >
                  {humanize(option)}
                </option>
              ),
            )}
          </select>
        </label>
      );
    }

    if (field.kind === "textarea") {
      return (
        <label
          className="forms-field forms-field-wide"
          key={field.key}
        >
          <span>
            {field.label}
            {field.required && (
              <b> required</b>
            )}
          </span>

          <textarea
            value={String(value)}
            required={field.required}
            rows={4}
            onChange={(event) =>
              set(event.target.value)
            }
          />
        </label>
      );
    }

    return (
      <label
        className="forms-field"
        key={field.key}
      >
        <span>
          {field.label}
          {field.required && (
            <b> required</b>
          )}
        </span>

        <input
          type={
            field.kind === "datetime"
              ? "datetime-local"
              : field.kind === "number"
                ? "number"
                : field.kind === "password"
                  ? "password"
                  : "text"
          }
          value={String(value)}
          required={field.required}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={(event) =>
            set(event.target.value)
          }
        />
      </label>
    );
  }

  if (loading) {
    return (
      <article className="card">
        <div className="card-body empty">
          Reading live forms…
        </div>
      </article>
    );
  }

  return (
    <div className="forms-shell">
      {error && (
        <div className="builder-error">
          {error}
        </div>
      )}

      {notice && (
        <div className="builder-success">
          {notice}
        </div>
      )}

      <section className="card forms-command">
        <div className="card-body forms-command-body">
          <div className="forms-resource-picker">
            <label htmlFor="forms-resource">
              What are you working with?
            </label>

            <select
              id="forms-resource"
              value={resourceKey}
              onChange={(event) => {
                setResourceKey(
                  event.target.value,
                );
                setAction("show");
                setNotice("");
                setError("");
              }}
            >
              {groups.map((group) => (
                <optgroup
                  key={group}
                  label={group}
                >
                  {availableResources
                    .filter(
                      (item) =>
                        item.group === group,
                    )
                    .map((item) => (
                      <option
                        key={item.key}
                        value={item.key}
                      >
                        {item.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div
            className="forms-actions"
            aria-label="Record action"
          >
            {(
              [
                "show",
                "add",
                "update",
                "delete",
              ] as FormAction[]
            ).map((item) => {
              const supported =
                supportedActions.includes(
                  item,
                );

              return (
                <button
                  key={item}
                  type="button"
                  disabled={!supported}
                  className={
                    action === item
                      ? "active"
                      : ""
                  }
                  title={
                    supported
                      ? undefined
                      : `No ${item} route is wired for this resource`
                  }
                  onClick={() => {
                    if (supported) {
                      setAction(item);
                      setNotice("");
                      setError("");
                    }
                  }}
                >
                  {item.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="forms-layout">
        <section className="card forms-record-card">
          <div className="card-head">
            <div>
              <div className="schema-name">
                {resource.label}
              </div>

              <div className="card-kicker">
                {rows.length} live record
                {rows.length === 1
                  ? ""
                  : "s"}
              </div>
            </div>
          </div>

          {action !== "add" && (
            <div className="card-body forms-record-picker">
              <label htmlFor="forms-record">
                Choose {resource.singular.toLowerCase()}
              </label>

              <select
                id="forms-record"
                value={selectedId}
                onChange={(event) =>
                  setSelectedId(
                    event.target.value,
                  )
                }
              >
                {!rows.length && (
                  <option value="">
                    No records yet
                  </option>
                )}

                {rows.map((row) => (
                  <option
                    key={String(row.id)}
                    value={String(row.id)}
                  >
                    {selectedLabel(row)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {action === "add" && (
            <div className="card-body forms-record-summary">
              <strong>
                New {resource.singular}
              </strong>

              <span>
                Uses the real {resource.endpoint} route.
              </span>
            </div>
          )}
        </section>

        <section className="card forms-panel">
          <div className="card-head">
            <div>
              <div className="schema-name">
                {action === "show"
                  ? "Show"
                  : action === "add"
                    ? "Add"
                    : action === "update"
                      ? "Update"
                      : "Delete"} {resource.singular}
              </div>

              <div className="card-kicker">
                {action === "show"
                  ? "Human-readable live record"
                  : "Real application operation"}
              </div>
            </div>

            <span className="chip">
              {resource.group}
            </span>
          </div>

          {action === "show" && (
            <div className="card-body">
              {selectedRow ? (
                <div className="forms-show-grid">
                  {Object.entries(
                    selectedRow,
                  ).map(([key, value]) => (
                    <div
                      className="forms-show-field"
                      key={key}
                    >
                      <span>
                        {humanize(key)}
                      </span>

                      <strong>
                        {fieldDisplay(
                          key,
                          value,
                        )}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  No record selected.
                </div>
              )}
            </div>
          )}

          {(action === "add" ||
            action === "update") && (
            <form
              className="card-body forms-form"
              onSubmit={mutate}
            >
              {action === "update" &&
              !selectedRow ? (
                <div className="empty">
                  Choose a record to update.
                </div>
              ) : (
                <>
                  <div className="forms-field-grid">
                    {fields.map(renderField)}
                  </div>

                  <div className="forms-submit-row">
                    <button
                      className="primary-action"
                      type="submit"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving…"
                        : action === "add"
                          ? `Add ${resource.singular}`
                          : `Save ${resource.singular}`}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {action === "delete" && (
            <div className="card-body forms-delete">
              {selectedRow ? (
                <>
                  <strong>
                    Delete “{selectedLabel(
                      selectedRow,
                    )}”?
                  </strong>

                  <p>
                    Appoponi will apply the same dependency rules as the normal admin app.
                  </p>

                  <button
                    type="button"
                    className="danger-action"
                    disabled={saving}
                    onClick={() =>
                      void removeSelected()
                    }
                  >
                    {saving
                      ? "Deleting…"
                      : `Delete ${resource.singular}`}
                  </button>
                </>
              ) : (
                <div className="empty">
                  Choose a record to delete.
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
