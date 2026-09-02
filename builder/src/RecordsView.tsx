import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Row = Record<string, unknown>;

type TableSummary = {
  name: string;
  row_count: number;
};

type Resource = {
  key: string;
  label: string;
  singular: string;
  table: string;
  group: string;
  columns: Array<{
    key: string;
    label: string;
    lookup?: string;
  }>;
};

const resources: Resource[] = [
  {
    key: "accounts",
    label: "Accounts",
    singular: "Account",
    table: "accounts",
    group: "People",
    columns: [
      { key: "username", label: "Username" },
      { key: "account_type", label: "Type" },
      {
        key: "must_change_password",
        label: "Password change",
      },
    ],
  },
  {
    key: "household_members",
    label: "Household Members",
    singular: "Household Member",
    table: "household_members",
    group: "People",
    columns: [
      { key: "full_name", label: "Name" },
      {
        key: "account_id",
        label: "Household",
        lookup: "accounts",
      },
      { key: "member_role", label: "Role" },
      { key: "email", label: "Email" },
    ],
  },
  {
    key: "staff_members",
    label: "Staff Members",
    singular: "Staff Member",
    table: "staff_members",
    group: "People",
    columns: [
      { key: "full_name", label: "Name" },
      {
        key: "account_id",
        label: "Account",
        lookup: "accounts",
      },
      { key: "role", label: "Role" },
      {
        key: "babysitting_eligible",
        label: "Babysitting",
      },
    ],
  },
  {
    key: "events",
    label: "Events",
    singular: "Event",
    table: "events",
    group: "Events",
    columns: [
      { key: "name", label: "Event" },
      {
        key: "event_type_id",
        label: "Type",
        lookup: "event_types",
      },
      { key: "starts_at", label: "Starts" },
      { key: "ends_at", label: "Ends" },
    ],
  },
  {
    key: "event_registrations",
    label: "Registrations",
    singular: "Registration",
    table: "event_registrations",
    group: "Events",
    columns: [
      {
        key: "account_id",
        label: "Household",
        lookup: "accounts",
      },
      {
        key: "event_id",
        label: "Event",
        lookup: "events",
      },
      {
        key: "spots_paid_for",
        label: "Paid spots",
      },
      {
        key: "cabin_id",
        label: "Cabin",
        lookup: "cabins",
      },
    ],
  },
  {
    key: "member_attendees",
    label: "Event Attendees",
    singular: "Event Attendee",
    table: "member_attendees",
    group: "Events",
    columns: [
      {
        key: "member_id",
        label: "Member",
        lookup: "household_members",
      },
      {
        key: "event_id",
        label: "Event",
        lookup: "events",
      },
    ],
  },
  {
    key: "areas",
    label: "Areas",
    singular: "Area",
    table: "areas",
    group: "Camp",
    columns: [
      { key: "name", label: "Area" },
      { key: "map_x", label: "Map X" },
      { key: "map_y", label: "Map Y" },
    ],
  },
  {
    key: "cabins",
    label: "Cabins",
    singular: "Cabin",
    table: "cabins",
    group: "Camp",
    columns: [
      { key: "name", label: "Cabin" },
      {
        key: "area_id",
        label: "Area",
        lookup: "areas",
      },
      { key: "map_x", label: "Map X" },
      { key: "map_y", label: "Map Y" },
    ],
  },
  {
    key: "activities",
    label: "Activities",
    singular: "Activity",
    table: "activities",
    group: "Camp",
    columns: [
      { key: "name", label: "Activity" },
      {
        key: "area_id",
        label: "Area",
        lookup: "areas",
      },
      { key: "setting", label: "Setting" },
    ],
  },
  {
    key: "event_activities",
    label: "Scheduled Activities",
    singular: "Scheduled Activity",
    table: "event_activities",
    group: "Schedule",
    columns: [
      {
        key: "event_id",
        label: "Event",
        lookup: "events",
      },
      {
        key: "activity_id",
        label: "Activity",
        lookup: "activities",
      },
      { key: "starts_at", label: "Starts" },
      { key: "capacity", label: "Capacity" },
    ],
  },
  {
    key: "event_activity_staff",
    label: "Activity Staff",
    singular: "Activity Staff Assignment",
    table: "event_activity_staff",
    group: "Schedule",
    columns: [
      {
        key: "event_activity_id",
        label: "Scheduled Activity",
        lookup: "event_activities",
      },
      {
        key: "staff_member_id",
        label: "Staff Member",
        lookup: "staff_members",
      },
    ],
  },
  {
    key: "event_activity_signups",
    label: "Activity Signups",
    singular: "Activity Signup",
    table: "event_activity_signups",
    group: "Schedule",
    columns: [
      {
        key: "member_attendee_id",
        label: "Attendee",
        lookup: "member_attendees",
      },
      {
        key: "event_activity_id",
        label: "Activity",
        lookup: "event_activities",
      },
      { key: "checked_in_at", label: "Checked in" },
      { key: "checked_out_at", label: "Checked out" },
    ],
  },
  {
    key: "event_meals",
    label: "Event Meals",
    singular: "Event Meal",
    table: "event_meals",
    group: "Services",
    columns: [
      {
        key: "event_id",
        label: "Event",
        lookup: "events",
      },
      {
        key: "meal_type_id",
        label: "Meal type",
        lookup: "meal_types",
      },
      { key: "title", label: "Title" },
      { key: "starts_at", label: "Starts" },
    ],
  },
  {
    key: "babysitting_requests",
    label: "Babysitting",
    singular: "Babysitting Request",
    table: "babysitting_requests",
    group: "Services",
    columns: [
      {
        key: "event_registration_id",
        label: "Registration",
        lookup: "event_registrations",
      },
      { key: "starts_at", label: "Starts" },
      { key: "ends_at", label: "Ends" },
      { key: "status", label: "Status" },
    ],
  },
  {
    key: "after_hours_orders",
    label: "After-hours Orders",
    singular: "After-hours Order",
    table: "after_hours_orders",
    group: "Services",
    columns: [
      {
        key: "event_registration_id",
        label: "Registration",
        lookup: "event_registrations",
      },
      { key: "fulfillment", label: "Fulfillment" },
      { key: "status", label: "Status" },
      {
        key: "delivery_location",
        label: "Delivery location",
      },
    ],
  },
];

async function readJson<T>(
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

function humanize(key: string) {
  return key
    .replace(/_id$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    );
}

function rawDisplay(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "string" && /_at$/.test("")) {
    return value;
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function rowLabel(row: Row | undefined) {
  if (!row) {
    return null;
  }

  const preferred = [
    "full_name",
    "name",
    "username",
    "title",
    "event_name",
    "activity_name",
    "source_name",
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
    : null;
}

export default function RecordsView() {
  const [tables, setTables] =
    useState<TableSummary[]>([]);

  const [resourceKey, setResourceKey] =
    useState(resources[0].key);

  const [rows, setRows] =
    useState<Row[]>([]);

  const [search, setSearch] =
    useState("");

  const [selectedIndex, setSelectedIndex] =
    useState(0);

  const [lookups, setLookups] =
    useState<Record<string, Row[]>>({});

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const resource =
    resources.find(
      (item) => item.key === resourceKey,
    ) ?? resources[0];

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

  async function loadTables() {
    const response = await fetch(
      "/__appoponi/data/tables",
      { credentials: "include" },
    );

    const data =
      await readJson<{
        tables: TableSummary[];
      }>(response);

    setTables(data.tables);

    const live = new Set(
      data.tables.map((table) => table.name),
    );

    const first = resources.find((item) =>
      live.has(item.table),
    );

    if (first) {
      setResourceKey((current) =>
        resources.some(
          (item) =>
            item.key === current &&
            live.has(item.table),
        )
          ? current
          : first.key,
      );
    }
  }

  async function loadTableRows(
    table: string,
    q = "",
    limit = 200,
  ) {
    const params =
      new URLSearchParams({
        limit: String(limit),
        offset: "0",
      });

    if (q.trim()) {
      params.set("q", q.trim());
    }

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

  async function loadResource(
    nextResource = resource,
    q = search,
  ) {
    setError("");

    const data = await loadTableRows(
      nextResource.table,
      q,
    );

    const lookupTables = Array.from(
      new Set(
        nextResource.columns
          .map((column) => column.lookup)
          .filter(
            (table): table is string =>
              Boolean(table),
          ),
      ),
    );

    const nextLookups: Record<
      string,
      Row[]
    > = {};

    await Promise.all(
      lookupTables.map(async (table) => {
        const lookup =
          await loadTableRows(
            table,
            "",
            1000,
          );

        nextLookups[table] = lookup.rows;
      }),
    );

    setRows(data.rows);
    setLookups(nextLookups);
    setSelectedIndex(0);
  }

  useEffect(() => {
    void loadTables()
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Could not load records",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!tables.length) {
      return;
    }

    void loadResource(resource, "").catch(
      (err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Could not load records",
        ),
    );
  }, [resourceKey, tables.length]);

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
        setSearch("");
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

  function display(
    key: string,
    value: unknown,
    lookup?: string,
  ) {
    if (
      lookup &&
      value !== null &&
      value !== undefined
    ) {
      const row = lookups[lookup]?.find(
        (item) =>
          String(item.id) === String(value),
      );

      const label = rowLabel(row);

      if (label) {
        return label;
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

    return rawDisplay(value);
  }

  const selectedRow =
    rows[selectedIndex] ?? null;

  if (loading) {
    return (
      <article className="card">
        <div className="card-body empty">
          Reading live records…
        </div>
      </article>
    );
  }

  return (
    <div className="records-shell">
      {error && (
        <div className="builder-error">
          {error}
        </div>
      )}

      <section className="card records-command">
        <div className="card-body records-command-body">
          <div className="records-resource-picker">
            <label htmlFor="records-resource">
              What are you working with?
            </label>

            <select
              id="records-resource"
              value={resourceKey}
              onChange={(event) => {
                setResourceKey(
                  event.target.value,
                );
                setSearch("");
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

          <form
            className="records-search"
            onSubmit={(event) => {
              event.preventDefault();

              void loadResource(
                resource,
                search,
              ).catch((err) =>
                setError(
                  err instanceof Error
                    ? err.message
                    : "Search failed",
                ),
              );
            }}
          >
            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder={`Search ${resource.label.toLowerCase()}`}
            />

            <button type="submit">
              Search
            </button>
          </form>
        </div>
      </section>

      <div className="records-layout">
        <section className="card records-list-card">
          <div className="card-head records-head">
            <div>
              <div className="schema-name">
                {resource.label}
              </div>

              <div className="card-kicker">
                Human-readable live records
              </div>
            </div>

            <span className="chip">
              {rows.length} shown
            </span>
          </div>

          <div className="records-table-wrap">
            {rows.length ? (
              <table className="records-table">
                <thead>
                  <tr>
                    {resource.columns.map(
                      (column) => (
                        <th key={column.key}>
                          {column.label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={String(
                        row.id ?? index,
                      )}
                      className={
                        selectedIndex === index
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        setSelectedIndex(index)
                      }
                    >
                      {resource.columns.map(
                        (column) => (
                          <td key={column.key}>
                            {display(
                              column.key,
                              row[column.key],
                              column.lookup,
                            )}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty">
                No {resource.label.toLowerCase()}.
              </div>
            )}
          </div>
        </section>

        <aside className="card records-inspector">
          <div className="card-head">
            <div>
              <div className="card-kicker">
                Selected {resource.singular}
              </div>

              <div className="records-selected-name">
                {rowLabel(
                  selectedRow ?? undefined,
                ) ?? "—"}
              </div>
            </div>
          </div>

          <div className="card-body">
            {selectedRow ? (
              <>
                <div className="records-fields">
                  {Object.entries(
                    selectedRow,
                  ).map(([key, value]) => {
                    const configured =
                      resource.columns.find(
                        (column) =>
                          column.key === key,
                      );

                    return (
                      <div
                        className="records-field"
                        key={key}
                      >
                        <span>
                          {configured?.label ??
                            humanize(key)}
                        </span>

                        <strong>
                          {display(
                            key,
                            value,
                            configured?.lookup,
                          )}
                        </strong>
                      </div>
                    );
                  })}
                </div>

                <details className="records-technical">
                  <summary>
                    Technical record
                  </summary>

                  <pre>
                    {JSON.stringify(
                      selectedRow,
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </>
            ) : (
              <div className="empty">
                Select a record.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
