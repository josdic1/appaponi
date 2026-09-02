import { useEffect, useState } from "react";

type SchemaColumn = {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
  ordinal_position: number;
};

type SchemaRelationship = {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
};

type SchemaTable = {
  name: string;
  columns: SchemaColumn[];
  relationships: SchemaRelationship[];
};

type SchemaResponse = {
  configured: boolean;
  tables: SchemaTable[];
  error?: string;
};

export default function SchemaView() {
  const [state, setState] =
    useState<"loading" | "ready" | "error">("loading");

  const [schema, setSchema] =
    useState<SchemaResponse | null>(null);

  const [selectedTable, setSelectedTable] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSchema() {
      try {
        const response = await fetch("/__appoponi/schema");
        const data = (await response.json()) as SchemaResponse;

        if (!response.ok) {
          throw new Error(
            data.error ?? "Could not load database schema",
          );
        }

        if (cancelled) {
          return;
        }

        setSchema(data);
        setSelectedTable(data.tables[0]?.name ?? null);
        setState("ready");
      } catch {
        if (!cancelled) {
          setState("error");
        }
      }
    }

    void loadSchema();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <section>
        <div className="page-head">
          <div>
            <div className="eyebrow">Schema</div>
            <h1>Database schema</h1>
          </div>
        </div>

        <article className="card">
          <div className="card-body empty">
            Reading database structure…
          </div>
        </article>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section>
        <div className="page-head">
          <div>
            <div className="eyebrow">Schema</div>
            <h1>Database schema</h1>
          </div>
        </div>

        <article className="card">
          <div className="card-body empty">
            Could not read the Appoponi backend schema endpoint.
          </div>
        </article>
      </section>
    );
  }

  if (!schema?.configured) {
    return (
      <section>
        <div className="page-head">
          <div>
            <div className="eyebrow">Schema</div>
            <h1>Database schema</h1>
            <p className="subtitle">
              The Builder is connected to Appoponi, but Appoponi does not
              have a PostgreSQL database configured yet.
            </p>
          </div>
        </div>

        <article className="card">
          <div className="card-body empty">
            <strong>Database not configured</strong>
            <span className="empty-sub">
              No tables are being invented or simulated.
            </span>
          </div>
        </article>
      </section>
    );
  }

  const table =
    schema.tables.find((item) => item.name === selectedTable) ?? null;

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">Schema</div>
          <h1>Database schema</h1>
          <p className="subtitle">
            Live PostgreSQL tables, columns, and relationships.
          </p>
        </div>
      </div>

      {schema.tables.length === 0 ? (
        <article className="card">
          <div className="card-body empty">
            Database connected. No public tables exist yet.
          </div>
        </article>
      ) : (
        <div className="schema-layout">
          <aside className="card schema-sidebar">
            <div className="card-head">
              <div>
                <div className="card-title">Tables</div>
                <div className="card-kicker">
                  {schema.tables.length} total
                </div>
              </div>
            </div>

            <div className="schema-table-list">
              {schema.tables.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className={`schema-table-button ${
                    item.name === selectedTable ? "active" : ""
                  }`}
                  onClick={() => setSelectedTable(item.name)}
                >
                  <code>{item.name}</code>
                  <span>{item.columns.length}</span>
                </button>
              ))}
            </div>
          </aside>

          <article className="card">
            {table && (
              <>
                <div className="card-head">
                  <div>
                    <div className="schema-name">{table.name}</div>
                    <div className="card-kicker">
                      {table.columns.length} columns ·{" "}
                      {table.relationships.length} relationships
                    </div>
                  </div>
                </div>

                <div className="schema-columns">
                  <div className="schema-column-row schema-column-head">
                    <span>Column</span>
                    <span>Type</span>
                    <span>Nullable</span>
                    <span>Default</span>
                  </div>

                  {table.columns.map((column) => (
                    <div
                      className="schema-column-row"
                      key={column.column_name}
                    >
                      <code>{column.column_name}</code>
                      <span>{column.data_type}</span>
                      <span>{column.is_nullable === "YES" ? "Yes" : "No"}</span>
                      <span className="schema-default">
                        {column.column_default ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>

                {table.relationships.length > 0 && (
                  <div className="schema-relations">
                    <div className="schema-section-label">
                      Relationships
                    </div>

                    {table.relationships.map((relationship) => (
                      <div
                        className="schema-relation"
                        key={`${relationship.column_name}-${relationship.foreign_table_name}-${relationship.foreign_column_name}`}
                      >
                        <code>{relationship.column_name}</code>
                        <span>→</span>
                        <code>
                          {relationship.foreign_table_name}.
                          {relationship.foreign_column_name}
                        </code>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </article>
        </div>
      )}
    </section>
  );
}
