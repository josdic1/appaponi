import {
  useMemo,
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

type EndpointGroup =
  | "system"
  | "auth"
  | "users"
  | "events"
  | "camp"
  | "staff"
  | "services";

type Endpoint = {
  method: Method;
  path: string;
  group: EndpointGroup;
  body?: string;
};

const groupOrder: Array<{
  key: EndpointGroup;
  label: string;
}> = [
  { key: "system", label: "System" },
  { key: "auth", label: "Auth / Login" },
  {
    key: "users",
    label: "Accounts + Households",
  },
  { key: "events", label: "Events" },
  { key: "camp", label: "Camp" },
  { key: "staff", label: "Staff" },
  {
    key: "services",
    label: "Guest Services",
  },
];

const endpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/api/health",
    group: "system",
  },
  {
    method: "POST",
    path: "/api/auth/login",
    group: "auth",
    body: JSON.stringify(
      {
        username: "",
        password: "",
      },
      null,
      2,
    ),
  },
  {
    method: "GET",
    path: "/api/auth/me",
    group: "auth",
  },
  {
    method: "POST",
    path: "/api/auth/logout",
    group: "auth",
    body: "{}",
  },
  {
    method: "POST",
    path: "/api/auth/change-password",
    group: "auth",
    body: JSON.stringify(
      {
        current_password: "",
        new_password: "",
      },
      null,
      2,
    ),
  },
  {
    method: "GET",
    path: "/api/accounts",
    group: "users",
  },
  {
    method: "GET",
    path: "/api/household-members",
    group: "users",
  },
  {
    method: "GET",
    path: "/api/event-types",
    group: "events",
  },
  {
    method: "GET",
    path: "/api/events",
    group: "events",
  },
  {
    method: "GET",
    path: "/api/registrations",
    group: "events",
  },
  {
    method: "GET",
    path: "/api/areas",
    group: "camp",
  },
  {
    method: "GET",
    path: "/api/cabins",
    group: "camp",
  },
  {
    method: "GET",
    path: "/api/activities",
    group: "camp",
  },
  {
    method: "GET",
    path: "/api/qualifications",
    group: "camp",
  },
  {
    method: "GET",
    path: "/api/staff-members",
    group: "staff",
  },
  {
    method: "GET",
    path: "/api/staff-day/activities",
    group: "staff",
  },
  {
    method: "GET",
    path: "/api/staff-day/participants",
    group: "staff",
  },
  {
    method: "GET",
    path: "/api/meals/types",
    group: "services",
  },
  {
    method: "GET",
    path: "/api/meals/menus",
    group: "services",
  },
  {
    method: "GET",
    path: "/api/meals/menu-items",
    group: "services",
  },
  {
    method: "GET",
    path: "/api/meals/event-meals",
    group: "services",
  },
  {
    method: "GET",
    path: "/api/after-hours/items",
    group: "services",
  },
  {
    method: "GET",
    path: "/api/after-hours/orders",
    group: "services",
  },
  {
    method: "GET",
    path: "/api/babysitting",
    group: "services",
  },
  {
    method: "GET",
    path: "/api/notifications",
    group: "services",
  },
  {
    method: "GET",
    path: "/api/notifications/preferences",
    group: "services",
  },
];

function pretty(value: unknown) {
  if (typeof value === "string") {
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
    useState<Method>("POST");

  const [path, setPath] =
    useState("/api/auth/login");

  const [body, setBody] =
    useState(
      JSON.stringify(
        {
          username: "",
          password: "",
        },
        null,
        2,
      ),
    );

  const [search, setSearch] =
    useState("");

  const [result, setResult] =
    useState<Result | null>(null);

  const [error, setError] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();

    return q
      ? endpoints.filter((endpoint) =>
          `${endpoint.method} ${endpoint.path}`
            .toLowerCase()
            .includes(q),
        )
      : endpoints;
  }, [search]);

  function selectEndpoint(
    endpoint: Endpoint,
  ) {
    setMethod(endpoint.method);
    setPath(endpoint.path);
    setBody(endpoint.body ?? "{}");
    setResult(null);
    setError("");
  }

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

      const init: RequestInit = {
        method,
        credentials: "include",
      };

      if (
        method !== "GET" &&
        method !== "DELETE"
      ) {
        let parsedBody: unknown;

        try {
          parsedBody = JSON.parse(
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

        init.body = JSON.stringify(
          parsedBody,
        );
      }

      const started =
        performance.now();

      const response = await fetch(
        normalizedPath,
        init,
      );

      const durationMs = Math.round(
        performance.now() - started,
      );

      const contentType =
        response.headers.get(
          "content-type",
        ) ?? "";

      let responseBody: unknown;

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
        status: response.status,
        statusText:
          response.statusText,
        durationMs,
        body: responseBody,
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
      <div className="page-head api-page-head">
        <div>
          <div className="eyebrow">
            Contract tester
          </div>

          <h1>API Tester</h1>

          <p className="subtitle">
            Login, inspect, and test
            Appoponi through its real
            backend routes.
          </p>
        </div>

        <div className="page-summary">
          <span className="chip good">
            {endpoints.length} routes
          </span>
        </div>
      </div>

      <div className="api-toolbar">
        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="Search endpoints…"
          aria-label="Search endpoints"
        />
      </div>

      <div className="api-layout">
        <aside className="card api-presets">
          <div className="card-head">
            <div>
              <div className="card-title">
                Routes
              </div>

              <div className="card-kicker">
                Grouped by what they do.
              </div>
            </div>
          </div>

          <div className="api-preset-list">
            {groupOrder.map((group) => {
              const groupEndpoints =
                visible.filter(
                  (endpoint) =>
                    endpoint.group ===
                    group.key,
                );

              if (!groupEndpoints.length) {
                return null;
              }

              return (
                <section
                  key={group.key}
                  id={`api-group-${group.key}`}
                  className="api-group-section"
                >
                  <div className="api-group-title">
                    {group.label}
                  </div>

                  {groupEndpoints.map(
                    (endpoint) => (
                      <button
                        type="button"
                        key={`${endpoint.method}-${endpoint.path}`}
                        className={
                          path === endpoint.path &&
                          method === endpoint.method
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          selectEndpoint(
                            endpoint,
                          )
                        }
                      >
                        <span>
                          {endpoint.method}
                        </span>

                        <code>
                          {endpoint.path}
                        </code>
                      </button>
                    ),
                  )}
                </section>
              );
            })}
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
                  Uses the Builder's current
                  browser session.
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
                        .value as Method,
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
                      event.target.value,
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
                method !== "DELETE" && (
                <label className="api-body-field">
                  <span>JSON body</span>
                  <textarea
                    value={body}
                    onChange={(event) =>
                      setBody(
                        event.target.value,
                      )
                    }
                    spellCheck={false}
                  />
                </label>
              )}
            </form>
          </article>

          <article className="card">
            <div className="card-head api-response-head">
              <div>
                <div className="card-title">
                  Response
                </div>

                <div className="card-kicker">
                  {result
                    ? `${result.durationMs} ms`
                    : "Send a request"}
                </div>
              </div>

              {result && (
                <span
                  className={`api-status ${
                    result.status >= 200 &&
                    result.status < 400
                      ? "success"
                      : "failure"
                  }`}
                >
                  {result.status}
                </span>
              )}
            </div>

            {error ? (
              <div className="builder-error api-error">
                {error}
              </div>
            ) : (
              <pre className="api-response">
                {result
                  ? pretty(result.body)
                  : "{}"}
              </pre>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
