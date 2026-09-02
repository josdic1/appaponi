import {
  useEffect,
  useState,
} from "react";
import ApiTesterView from "./ApiTesterView";
import BuilderSectionRail from "./BuilderSectionRail";
import DatabaseView from "./DatabaseView";
import DataWorkspaceView from "./DataWorkspaceView";
import IdeaLogView from "./IdeaLogView";
import ImportView from "./ImportView";
import SchemaView from "./SchemaView";

type Tab =
  | "data"
  | "schema"
  | "database"
  | "api"
  | "ideas"
  | "import";

const tabs: Array<{
  id: Exclude<Tab, "data">;
  label: string;
}> = [
  { id: "schema", label: "Schema" },
  { id: "database", label: "Database" },
  { id: "api", label: "API Tester" },
  { id: "ideas", label: "Idea Log" },
  { id: "import", label: "Import" },
];

export default function App() {
  const [tab, setTab] =
    useState<Tab>("data");

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

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="brand"
          type="button"
          onClick={() =>
            setTab("data")
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

        <button
          className={`live-data-link ${
            tab === "data"
              ? "active"
              : ""
          }`}
          type="button"
          onClick={() =>
            setTab("data")
          }
        >
          <span
            className="live-data-dot"
            aria-hidden="true"
          />
          Live Data
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
            : apiState === "connected"
              ? "API connected"
              : "API offline"}
        </div>
      </header>

      <BuilderSectionRail tab={tab} />

      <main>
        {tab === "data" && (
          <DataWorkspaceView />
        )}

        {tab === "schema" && (
          <SchemaView />
        )}

        {tab === "database" && (
          <DatabaseView />
        )}

        {tab === "api" && (
          <ApiTesterView />
        )}

        {tab === "ideas" && (
          <IdeaLogView />
        )}

        {tab === "import" && (
          <ImportView />
        )}
      </main>
    </div>
  );
}
