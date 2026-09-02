import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Column = {
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
};

type Relationship = {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
};

type Table = {
  name: string;
  columns: Column[];
  relationships: Relationship[];
};

type SchemaResponse = {
  configured: boolean;
  tables: Table[];
  error?: string;
};

type TableSummary = {
  name: string;
  row_count: number;
};

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

function groupFor(name: string) {
  if (
    name === "accounts" ||
    name.includes("household") ||
    name.includes("staff_member")
  ) {
    return "People";
  }

  if (
    name.startsWith("event") ||
    name === "activities" ||
    name === "areas" ||
    name === "cabins" ||
    name.includes("qualification")
  ) {
    return "Events + Camp";
  }

  if (
    name.includes("meal") ||
    name.includes("babysitting") ||
    name.includes("after_hours") ||
    name.includes("notification")
  ) {
    return "Guest Services";
  }

  return "System + Import";
}

export default function DatabaseView() {
  const [schema, setSchema] =
    useState<SchemaResponse | null>(null);

  const [counts, setCounts] =
    useState<TableSummary[]>([]);

  const [selected, setSelected] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function load() {
    setError("");
    setLoading(true);

    try {
      const [schemaResponse, tablesResponse] =
        await Promise.all([
          fetch("/__appoponi/schema", {
            credentials: "include",
          }),
          fetch("/__appoponi/data/tables", {
            credentials: "include",
          }),
        ]);

      const schemaData =
        await readJson<SchemaResponse>(
          schemaResponse,
        );

      const tablesData =
        await readJson<{
          tables: TableSummary[];
        }>(tablesResponse);

      setSchema(schemaData);
      setCounts(tablesData.tables);

      setSelected((current) =>
        current ||
        schemaData.tables[0]?.name ||
        "",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load database",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const table =
    schema?.tables.find(
      (item) => item.name === selected,
    ) ?? null;

  const groups = useMemo(() => {
    if (!schema) {
      return [];
    }

    const order = [
      "People",
      "Events + Camp",
      "Guest Services",
      "System + Import",
    ];

    return order
      .map((label) => ({
        label,
        tables: schema.tables.filter(
          (item) =>
            groupFor(item.name) === label,
        ),
      }))
      .filter((group) => group.tables.length);
  }, [schema]);

  const foreignKeyCount =
    schema?.tables.reduce(
      (sum, item) =>
        sum + item.relationships.length,
      0,
    ) ?? 0;

  return (
    <section>
      <div className="page-head database-page-head">
        <div>
          <div className="eyebrow">
            Live PostgreSQL
          </div>

          <h1>Actual database</h1>

          <p className="subtitle">
            Physical truth from Appoponi:
            tables, rows, columns, and
            relationships. Read only.
          </p>
        </div>

        <div className="page-summary">
          <span className="chip good">
            {schema?.tables.length ?? 0} tables
          </span>

          <span className="chip">
            {foreignKeyCount} foreign keys
          </span>

          <button
            type="button"
            className="builder-primary"
            onClick={() => void load()}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="builder-error">
          {error}
        </div>
      )}

      {loading ? (
        <article className="card">
          <div className="card-body empty">
            Reading live PostgreSQL…
          </div>
        </article>
      ) : (
        <div className="database-layout">
          <div className="database-main">
            <section className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">
                    Relationship map
                  </div>

                  <div className="card-kicker">
                    Select a table to inspect
                    its exact structure.
                  </div>
                </div>
              </div>

              <div className="database-map">
                {groups.map((group) => (
                  <section
                    className="database-group"
                    key={group.label}
                  >
                    <div className="database-group-label">
                      {group.label}
                    </div>

                    <div className="database-nodes">
                      {group.tables.map(
                        (item) => {
                          const count =
                            counts.find(
                              (entry) =>
                                entry.name ===
                                item.name,
                            )?.row_count ?? 0;

                          return (
                            <button
                              key={item.name}
                              type="button"
                              className={`database-node ${
                                selected === item.name
                                  ? "active"
                                  : ""
                              }`}
                              onClick={() =>
                                setSelected(
                                  item.name,
                                )
                              }
                            >
                              <code>
                                {item.name}
                              </code>

                              <span>
                                {count} rows ·{" "}
                                {item.columns.length} cols
                              </span>

                              {item.relationships.length >
                                0 && (
                                <small>
                                  {item.relationships
                                    .map(
                                      (relation) =>
                                        relation.foreign_table_name,
                                    )
                                    .join(" · ")}
                                </small>
                              )}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          </div>

          <aside className="card database-detail">
            <div className="card-head">
              <div>
                <div className="card-kicker">
                  Selected live table
                </div>

                <div className="schema-name">
                  {table?.name ?? "—"}
                </div>
              </div>
            </div>

            {table && (
              <div className="card-body">
                <div className="database-stats">
                  <div>
                    <strong>
                      {counts.find(
                        (entry) =>
                          entry.name === table.name,
                      )?.row_count ?? 0}
                    </strong>
                    <span>rows</span>
                  </div>

                  <div>
                    <strong>
                      {table.columns.length}
                    </strong>
                    <span>columns</span>
                  </div>

                  <div>
                    <strong>
                      {table.relationships.length}
                    </strong>
                    <span>foreign keys</span>
                  </div>
                </div>

                <div className="database-detail-section">
                  <div className="schema-section-label">
                    Columns
                  </div>

                  {table.columns.map(
                    (column) => (
                      <div
                        className="database-column"
                        key={column.column_name}
                      >
                        <code>
                          {column.column_name}
                        </code>

                        <span>
                          {column.data_type}
                        </span>
                      </div>
                    ),
                  )}
                </div>

                <div className="database-detail-section">
                  <div className="schema-section-label">
                    Relationships
                  </div>

                  {table.relationships.length ? (
                    table.relationships.map(
                      (relation) => (
                        <div
                          className="database-relation"
                          key={`${relation.column_name}-${relation.foreign_table_name}`}
                        >
                          <code>
                            {relation.column_name}
                          </code>
                          <span>→</span>
                          <code>
                            {relation.foreign_table_name}.
                            {relation.foreign_column_name}
                          </code>
                        </div>
                      ),
                    )
                  ) : (
                    <div className="database-none">
                      No outgoing foreign keys.
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
