import {
  useEffect,
  useState,
} from "react";
import DataView from "./DataView";
import ImportView from "./ImportView";
import SchemaView from "./SchemaView";

type Tab =
  | "overview"
  | "import"
  | "schema"
  | "data"
  | "api";

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

        {tab === "import" && <ImportView />}

        {tab === "schema" && <SchemaView />}

        {tab === "data" && <DataView />}

        {tab === "api" && (
          <section>
            <div className="page-head">
              <div>
                <div className="eyebrow">
                  api
                </div>

                <h1>{currentLabel}</h1>

                <p className="subtitle">
                  API Tester is the next Builder pass.
                </p>
              </div>
            </div>

            <article className="card">
              <div className="card-body empty">
                Ready for Appoponi API routes.
              </div>
            </article>
          </section>
        )}
      </main>
    </div>
  );
}
