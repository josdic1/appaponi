import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react";

type Tab =
  | "overview"
  | "import"
  | "schema"
  | "data"
  | "api";

type StagedFile = {
  name: string;
  size: number;
  type: string;
  preview: string | null;
};

const tabs: Array<{
  id: Tab;
  label: string;
}> = [
  { id: "overview", label: "Overview" },
  { id: "import", label: "Import" },
  { id: "schema", label: "Schema" },
  { id: "data", label: "Data" },
  { id: "api", label: "API Tester" },
];

export default function App() {
  const [tab, setTab] =
    useState<Tab>("overview");

  const [apiState, setApiState] =
    useState<
      "checking" | "connected" | "offline"
    >("checking");

  const [stagedFile, setStagedFile] =
    useState<StagedFile | null>(null);

  const [pasted, setPasted] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/health")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Health check failed",
          );
        }

        if (!cancelled) {
          setApiState("connected");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiState("offline");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function stageFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const binary =
      /\.(xlsx|xls)$/i.test(file.name);

    const preview = binary
      ? null
      : (await file.text()).slice(
          0,
          6000,
        );

    setStagedFile({
      name: file.name,
      size: file.size,
      type:
        file.type || "unknown",
      preview,
    });
  }

  const currentLabel =
    tabs.find(
      (item) => item.id === tab,
    )?.label ?? tab;

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="brand"
          type="button"
          onClick={() =>
            setTab("overview")
          }
        >
          <span className="mark">
            A
          </span>

          <span className="brand-copy">
            <span className="brand-name">
              Appoponi Builder
            </span>

            <span className="brand-sub">
              application workspace
            </span>
          </span>
        </button>

        <nav
          className="tabs"
          aria-label="Builder sections"
        >
          {tabs.map((item) => (
            <button
              className={`tab ${
                tab === item.id
                  ? "active"
                  : ""
              }`}
              key={item.id}
              type="button"
              onClick={() =>
                setTab(item.id)
              }
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="top-spacer" />

        <div
          className={`status ${apiState}`}
        >
          <span className="dot" />

          {apiState === "checking"
            ? "Checking API…"
            : apiState ===
                "connected"
              ? "API connected"
              : "API offline"}
        </div>
      </header>

      <main>
        {tab === "overview" && (
          <section>
            <div className="page-head">
              <div>
                <div className="eyebrow">
                  Appoponi
                </div>

                <h1>Builder</h1>

                <p className="subtitle">
                  A human workspace over
                  Appoponi's real
                  contracts, database,
                  records, and imports.
                </p>
              </div>
            </div>

            <div className="overview-grid">
              <article className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      Foundation
                    </div>

                    <div className="card-kicker">
                      What exists right now.
                    </div>
                  </div>
                </div>

                <div className="card-body rows">
                  <div>
                    <span>Frontend</span>
                    <strong>
                      React + Vite
                    </strong>
                  </div>

                  <div>
                    <span>Backend</span>
                    <strong>
                      Express + TypeScript
                    </strong>
                  </div>

                  <div>
                    <span>
                      Shared contracts
                    </span>
                    <strong>
                      @appoponi/shared
                    </strong>
                  </div>

                  <div>
                    <span>Database</span>
                    <strong>
                      PostgreSQL
                    </strong>
                  </div>
                </div>
              </article>

              <article className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      Import pipeline
                    </div>

                    <div className="card-kicker">
                      Nothing writes directly
                      to Appoponi data.
                    </div>
                  </div>
                </div>

                <div className="card-body pipeline">
                  <span>Raw input</span>
                  <b>→</b>
                  <span>Parse</span>
                  <b>→</b>
                  <span>Map</span>
                  <b>→</b>
                  <span>Review</span>
                  <b>→</b>
                  <span>Validate</span>
                  <b>→</b>
                  <span>Commit</span>
                </div>
              </article>
            </div>
          </section>
        )}

        {tab === "import" && (
          <section>
            <div className="page-head">
              <div>
                <div className="eyebrow">
                  Raw intake
                </div>

                <h1>Import</h1>

                <p className="subtitle">
                  Stage source data first.
                  Parsing and mapping happen
                  before anything can reach
                  Appoponi records.
                </p>
              </div>
            </div>

            <div className="import-grid">
              <article className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      File
                    </div>

                    <div className="card-kicker">
                      JSON, CSV, TSV, text,
                      Excel.
                    </div>
                  </div>
                </div>

                <div className="card-body">
                  <label className="file-drop">
                    <strong>
                      Choose source file
                    </strong>

                    <span>
                      No database write occurs.
                    </span>

                    <input
                      type="file"
                      accept=".json,.csv,.tsv,.txt,.xlsx,.xls,application/json,text/csv,text/plain"
                      onChange={stageFile}
                    />
                  </label>
                </div>
              </article>

              <article className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">
                      Paste
                    </div>

                    <div className="card-kicker">
                      Tables, reports, JSON,
                      CSV, or plain text.
                    </div>
                  </div>
                </div>

                <div className="card-body">
                  <textarea
                    value={pasted}
                    onChange={(event) =>
                      setPasted(
                        event.target.value,
                      )
                    }
                    placeholder="Paste source data here…"
                  />
                </div>
              </article>
            </div>

            <article className="card staged-card">
              <div className="card-head">
                <div>
                  <div className="card-title">
                    Staging preview
                  </div>

                  <div className="card-kicker">
                    Raw source only. No
                    Appoponi meaning inferred
                    yet.
                  </div>
                </div>
              </div>

              <div className="card-body">
                {stagedFile ? (
                  <>
                    <div className="file-meta">
                      <strong>
                        {stagedFile.name}
                      </strong>

                      <span>
                        {stagedFile.size.toLocaleString()}
                        {" bytes · "}
                        {stagedFile.type}
                      </span>
                    </div>

                    <pre>
                      {stagedFile.preview ??
                        "Binary Excel file staged. Parser not connected yet."}
                    </pre>
                  </>
                ) : pasted.trim() ? (
                  <pre>
                    {pasted.slice(
                      0,
                      6000,
                    )}
                  </pre>
                ) : (
                  <div className="empty">
                    Choose a file or paste
                    data to create a raw
                    staging record.
                  </div>
                )}
              </div>
            </article>
          </section>
        )}

        {(tab === "schema" ||
          tab === "data" ||
          tab === "api") && (
          <section>
            <div className="page-head">
              <div>
                <div className="eyebrow">
                  {tab}
                </div>

                <h1>
                  {currentLabel}
                </h1>

                <p className="subtitle">
                  This screen will read
                  Appoponi's real backend.
                  No Matapon schema or fake
                  records are being copied
                  into it.
                </p>
              </div>
            </div>

            <article className="card">
              <div className="card-body empty">
                Ready for the Appoponi
                contracts.
              </div>
            </article>
          </section>
        )}
      </main>
    </div>
  );
}
