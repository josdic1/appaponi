import {
  useEffect,
  useMemo,
  useState,
} from "react";

type TableSummary = {
  name: string;
  row_count: number;
};

type Column = {
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
};

type DataResponse = {
  table: string;
  rows: Array<Record<string, unknown>>;
  total: number;
  limit: number;
  offset: number;
  columns: Column[];
  redacted_fields: string[];
  error?: string;
};

const PAGE_SIZE = 100;

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

function displayValue(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export default function DataView({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [tables, setTables] =
    useState<TableSummary[]>([]);

  const [
    selectedTable,
    setSelectedTable,
  ] = useState("");

  const [rows, setRows] =
    useState<
      Array<Record<string, unknown>>
    >([]);

  const [columns, setColumns] =
    useState<Column[]>([]);

  const [total, setTotal] =
    useState(0);

  const [offset, setOffset] =
    useState(0);

  const [
    tableSearch,
    setTableSearch,
  ] = useState("");

  const [
    rowSearch,
    setRowSearch,
  ] = useState("");

  const [
    selectedIndex,
    setSelectedIndex,
  ] = useState(0);

  const [
    redacted,
    setRedacted,
  ] = useState<string[]>([]);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  async function loadTables() {
    const response = await fetch(
      "/__appoponi/data/tables",
      {
        credentials: "include",
      },
    );

    const data =
      await readJson<{
        tables: TableSummary[];
      }>(response);

    setTables(data.tables);

    setSelectedTable(
      (current) =>
        current ||
        data.tables[0]?.name ||
        "",
    );
  }

  async function loadRows(
    table = selectedTable,
    nextOffset = offset,
    search = rowSearch,
  ) {
    if (!table) {
      return;
    }

    const params =
      new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(nextOffset),
      });

    if (search.trim()) {
      params.set(
        "q",
        search.trim(),
      );
    }

    const response = await fetch(
      `/__appoponi/data/${encodeURIComponent(
        table,
      )}?${params}`,
      {
        credentials: "include",
      },
    );

    const data =
      await readJson<DataResponse>(
        response,
      );

    setRows(data.rows);
    setColumns(data.columns);
    setTotal(data.total);
    setOffset(data.offset);
    setRedacted(
      data.redacted_fields,
    );
    setSelectedIndex(0);
  }

  useEffect(() => {
    void loadTables()
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load Data",
        );
      })
      .finally(() =>
        setLoading(false),
      );
  }, []);

  useEffect(() => {
    if (!selectedTable) {
      return;
    }

    setError("");

    void loadRows(
      selectedTable,
      0,
      "",
    ).catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load rows",
      ),
    );
  }, [selectedTable]);

  const filteredTables =
    useMemo(() => {
      const query =
        tableSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return tables;
      }

      return tables.filter(
        (table) =>
          table.name
            .toLowerCase()
            .includes(query),
      );
    }, [
      tables,
      tableSearch,
    ]);

  const selectedRow =
    rows[selectedIndex] ?? null;

  const visibleColumns =
    rows[0]
      ? Object.keys(rows[0])
      : columns.map(
          (column) =>
            column.column_name,
        );

  if (loading) {
    return (
      <section>
        {!embedded && (
          <div className="page-head">
            <div>
              <div className="eyebrow">
                Data
              </div>

              <h1>Live data</h1>
            </div>
          </div>
        )}

        <article className="card">
          <div className="card-body empty">
            Reading Appoponi…
          </div>
        </article>
      </section>
    );
  }

  return (
    <section>
      {!embedded && (
        <div className="page-head">
          <div>
            <div className="eyebrow">
              Data
            </div>

            <h1>Live data</h1>

            <p className="subtitle">
              Read the actual PostgreSQL
              records. Sensitive fields are
              hidden.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="builder-error">
          {error}
        </div>
      )}

      <div className="data-layout">
        <aside className="card data-sidebar">
          <div className="card-head">
            <div>
              <div className="card-title">
                Tables
              </div>

              <div className="card-kicker">
                {tables.length} total
              </div>
            </div>
          </div>

          <div className="data-search-wrap">
            <input
              value={tableSearch}
              onChange={(event) =>
                setTableSearch(
                  event.target.value,
                )
              }
              placeholder="Find table"
            />
          </div>

          <div className="data-table-list">
            {filteredTables.map(
              (table) => (
                <button
                  key={table.name}
                  type="button"
                  className={`data-table-button ${
                    selectedTable ===
                    table.name
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedTable(
                      table.name,
                    );
                    setRowSearch("");
                    setOffset(0);
                  }}
                >
                  <code>
                    {table.name}
                  </code>

                  <span>
                    {table.row_count}
                  </span>
                </button>
              ),
            )}
          </div>
        </aside>

        <div className="data-main">
          <article className="card">
            <div className="card-head data-card-head">
              <div>
                <div className="schema-name">
                  {selectedTable || "—"}
                </div>

                <div className="card-kicker">
                  {total} rows
                </div>
              </div>

              <form
                className="data-row-search"
                onSubmit={(event) => {
                  event.preventDefault();

                  void loadRows(
                    selectedTable,
                    0,
                    rowSearch,
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
                  value={rowSearch}
                  onChange={(event) =>
                    setRowSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search rows"
                />

                <button type="submit">
                  Search
                </button>
              </form>
            </div>

            {redacted.length > 0 && (
              <div className="data-redacted">
                Hidden:{" "}
                {redacted.join(", ")}
              </div>
            )}

            <div className="data-grid-wrap">
              {rows.length ? (
                <table className="data-grid">
                  <thead>
                    <tr>
                      <th>#</th>

                      {visibleColumns.map(
                        (column) => (
                          <th key={column}>
                            {column}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map(
                      (row, index) => (
                        <tr
                          key={String(
                            row.id ?? index,
                          )}
                          className={
                            selectedIndex ===
                            index
                              ? "selected"
                              : ""
                          }
                          onClick={() =>
                            setSelectedIndex(
                              index,
                            )
                          }
                        >
                          <td>
                            {offset +
                              index +
                              1}
                          </td>

                          {visibleColumns.map(
                            (column) => (
                              <td key={column}>
                                {displayValue(
                                  row[column],
                                )}
                              </td>
                            ),
                          )}
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="empty">
                  No rows.
                </div>
              )}
            </div>

            <div className="data-pagination">
              <span>
                {rows.length
                  ? `${offset + 1}–${offset + rows.length} of ${total}`
                  : "0 rows"}
              </span>

              <div>
                <button
                  type="button"
                  disabled={
                    offset === 0
                  }
                  onClick={() =>
                    void loadRows(
                      selectedTable,
                      Math.max(
                        offset -
                          PAGE_SIZE,
                        0,
                      ),
                    )
                  }
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={
                    offset +
                      rows.length >=
                    total
                  }
                  onClick={() =>
                    void loadRows(
                      selectedTable,
                      offset +
                        PAGE_SIZE,
                    )
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </article>

          <article className="card">
            <div className="card-head">
              <div>
                <div className="card-title">
                  Selected row
                </div>

                <div className="card-kicker">
                  {selectedRow
                    ? `ID ${String(
                        selectedRow.id ??
                          "—",
                      )}`
                    : "No row selected"}
                </div>
              </div>
            </div>

            <pre className="data-json">
              {selectedRow
                ? JSON.stringify(
                    selectedRow,
                    null,
                    2,
                  )
                : "{}"}
            </pre>
          </article>
        </div>
      </div>
    </section>
  );
}
