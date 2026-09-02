import {
  useState,
} from "react";
import DataView from "./DataView";
import FormsView from "./FormsView";
import RecordsView from "./RecordsView";

type Mode =
  | "forms"
  | "records"
  | "tables";

export default function DataWorkspaceView() {
  const [mode, setMode] =
    useState<Mode>("forms");

  return (
    <section>
      <div className="page-head data-workspace-head">
        <div>
          <div className="eyebrow">
            Application records
          </div>

          <h1>Live Data</h1>

          <p className="subtitle">
            Use Forms to work with live Appoponi data.
            Records is the human view. Tables is the exact database view.
          </p>
        </div>

        <span className="chip good">
          Live database
        </span>
      </div>

      <div
        className="data-workspace-bar"
        role="tablist"
        aria-label="Data view"
      >
        <button
          type="button"
          className={
            mode === "forms"
              ? "active"
              : ""
          }
          onClick={() =>
            setMode("forms")
          }
        >
          Forms
        </button>

        <button
          type="button"
          className={
            mode === "records"
              ? "active"
              : ""
          }
          onClick={() =>
            setMode("records")
          }
        >
          Records
        </button>

        <button
          type="button"
          className={
            mode === "tables"
              ? "active"
              : ""
          }
          onClick={() =>
            setMode("tables")
          }
        >
          Tables
        </button>

        <span>
          {mode === "forms"
            ? "SHOW · ADD · UPDATE · real app routes"
            : mode === "records"
              ? "Human-readable · relationships translated"
              : "Exact PostgreSQL rows · read only"}
        </span>
      </div>

      {mode === "forms" ? (
        <FormsView />
      ) : mode === "records" ? (
        <RecordsView />
      ) : (
        <DataView embedded />
      )}
    </section>
  );
}
