import {
  useState,
  type FormEvent,
} from "react";

type Method =
  | "GET"
  | "POST"
  | "PATCH"
  | "DELETE";

type Result = {
  status: number;
  statusText: string;
  durationMs: number;
  body: unknown;
};

const presets = [
  "/api/accounts",
  "/api/household-members",
  "/api/staff-members",
  "/api/areas",
  "/api/activities",
  "/api/event-types",
  "/api/events",
  "/api/qualifications",
  "/api/registrations",
  "/api/meals/types",
  "/api/meals/menus",
  "/api/meals/menu-items",
  "/api/meals/event-meals",
  "/api/after-hours/items",
  "/api/after-hours/orders",
  "/api/babysitting",
  "/api/notifications",
  "/api/notifications/preferences",
  "/api/staff-day/activities",
  "/api/staff-day/participants",
];

function pretty(
  value: unknown,
) {
  if (
    typeof value === "string"
  ) {
    return value;
  }

  return JSON.stringify(
    value,
    null,
    2,
  );
}

export default function ApiTesterView() {
  const [method, setMethod] =
    useState<Method>("GET");

  const [path, setPath] =
    useState("/api/events");

  const [body, setBody] =
    useState("{}");

  const [result, setResult] =
    useState<Result | null>(
      null,
    );

  const [error, setError] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  async function send(
    event?: FormEvent,
  ) {
    event?.preventDefault();

    setBusy(true);
    setError("");
    setResult(null);

    try {
      const normalizedPath =
        path.trim();

      if (
        !normalizedPath.startsWith(
          "/api/",
        )
      ) {
        throw new Error(
          "Path must start with /api/",
        );
      }

      const init:
        RequestInit = {
          method,
          credentials: "include",
        };

      if (
        method !== "GET" &&
        method !== "DELETE"
      ) {
        let parsedBody:
          unknown;

        try {
          parsedBody =
            JSON.parse(
              body || "{}",
            );
        } catch {
          throw new Error(
            "Request body is not valid JSON",
          );
        }

        init.headers = {
          "Content-Type":
            "application/json",
        };

        init.body =
          JSON.stringify(
            parsedBody,
          );
      }

      const started =
        performance.now();

      const response =
        await fetch(
          normalizedPath,
          init,
        );

      const durationMs =
        Math.round(
          performance.now() -
            started,
        );

      const contentType =
        response.headers.get(
          "content-type",
        ) ?? "";

      let responseBody:
        unknown;

      if (
        contentType.includes(
          "application/json",
        )
      ) {
        responseBody =
          await response.json();
      } else {
        responseBody =
          await response.text();
      }

      setResult({
        status:
          response.status,
        statusText:
          response.statusText,
        durationMs,
        body:
          responseBody,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Request failed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            API
          </div>

          <h1>API Tester</h1>

          <p className="subtitle">
            Send requests through
            Appoponi's real backend
            using your current login.
          </p>
        </div>
      </div>

      <div className="api-layout">
        <aside className="card api-presets">
          <div className="card-head">
            <div>
              <div className="card-title">
                Routes
              </div>

              <div className="card-kicker">
                Confirmed GET endpoints.
              </div>
            </div>
          </div>

          <div className="api-preset-list">
            {presets.map(
              (preset) => (
                <button
                  type="button"
                  key={preset}
                  className={
                    path === preset
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setMethod("GET");
                    setPath(preset);
                  }}
                >
                  <span>GET</span>

                  <code>
                    {preset}
                  </code>
                </button>
              ),
            )}
          </div>
        </aside>

        <div className="api-main">
          <article className="card">
            <div className="card-head">
              <div>
                <div className="card-title">
                  Request
                </div>

                <div className="card-kicker">
                  Custom paths are
                  allowed too.
                </div>
              </div>
            </div>

            <form
              className="api-form"
              onSubmit={send}
            >
              <div className="api-request-line">
                <select
                  value={method}
                  onChange={(event) =>
                    setMethod(
                      event.target
                        .value as
                        Method,
                    )
                  }
                >
                  <option value="GET">
                    GET
                  </option>

                  <option value="POST">
                    POST
                  </option>

                  <option value="PATCH">
                    PATCH
                  </option>

                  <option value="DELETE">
                    DELETE
                  </option>
                </select>

                <input
                  value={path}
                  onChange={(event) =>
                    setPath(
                      event.target
                        .value,
                    )
                  }
                  placeholder="/api/events"
                />

                <button
                  className="builder-primary"
                  type="submit"
                  disabled={busy}
                >
                  {busy
                    ? "Sending…"
                    : "Send"}
                </button>
              </div>

              {method !== "GET" &&
                method !==
                  "DELETE" && (
                  <label className="api-body-field">
                    <span>
                      JSON body
                    </span>

                    <textarea
                      value={body}
                      onChange={(
                        event,
                      ) =>
                        setBody(
                          event
                            .target
                            .value,
                        )
                      }
                      spellCheck={false}
                    />
                  </label>
                )}
            </form>
          </article>

          {error && (
            <div className="builder-error">
              {error}
            </div>
          )}

          <article className="card">
            <div className="card-head">
              <div>
                <div className="card-title">
                  Response
                </div>

                <div className="card-kicker">
                  {result
                    ? `${result.status} ${result.statusText} · ${result.durationMs} ms`
                    : "Send a request"}
                </div>
              </div>

              {result && (
                <span
                  className={`api-status ${
                    result.status >=
                      200 &&
                    result.status <
                      300
                      ? "success"
                      : "failure"
                  }`}
                >
                  {result.status}
                </span>
              )}
            </div>

            <pre className="api-response">
              {result
                ? pretty(
                    result.body,
                  )
                : "{}"}
            </pre>
          </article>
        </div>
      </div>
    </section>
  );
}
