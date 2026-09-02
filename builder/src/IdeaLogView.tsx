import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

type IdeaStatus =
  | "active"
  | "done"
  | "trash";

type IdeaFilter =
  | IdeaStatus
  | "all";

type Idea = {
  id: string;
  text: string;
  status: IdeaStatus;
};

const STORAGE_KEY =
  "appoponi_builder_idea_log_v1";

function readIdeas(): Idea[] {
  try {
    const raw =
      localStorage.getItem(
        STORAGE_KEY,
      );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is Idea =>
            item &&
            typeof item.id === "string" &&
            typeof item.text === "string" &&
            [
              "active",
              "done",
              "trash",
            ].includes(item.status),
        )
      : [];
  } catch {
    return [];
  }
}

export default function IdeaLogView() {
  const [ideas, setIdeas] =
    useState<Idea[]>(readIdeas);

  const [text, setText] =
    useState("");

  const [filter, setFilter] =
    useState<IdeaFilter>("active");

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(ideas),
    );
  }, [ideas]);

  useEffect(() => {
    function handleFilter(
      event: Event,
    ) {
      const next =
        (event as CustomEvent<string>)
          .detail as IdeaFilter;

      if (
        [
          "active",
          "done",
          "trash",
          "all",
        ].includes(next)
      ) {
        setFilter(next);
      }
    }

    window.addEventListener(
      "appoponi-builder-idea-filter",
      handleFilter,
    );

    return () =>
      window.removeEventListener(
        "appoponi-builder-idea-filter",
        handleFilter,
      );
  }, []);

  const counts = useMemo(
    () => ({
      active: ideas.filter(
        (idea) =>
          idea.status === "active",
      ).length,
      done: ideas.filter(
        (idea) =>
          idea.status === "done",
      ).length,
      trash: ideas.filter(
        (idea) =>
          idea.status === "trash",
      ).length,
      all: ideas.length,
    }),
    [ideas],
  );

  const visible =
    filter === "all"
      ? ideas
      : ideas.filter(
          (idea) =>
            idea.status === filter,
        );

  function addIdea(
    event: FormEvent,
  ) {
    event.preventDefault();

    const value = text.trim();

    if (!value) {
      return;
    }

    setIdeas((current) => [
      {
        id: crypto.randomUUID(),
        text: value,
        status: "active",
      },
      ...current,
    ]);

    setText("");
    setFilter("active");
  }

  function update(
    id: string,
    status: IdeaStatus,
  ) {
    setIdeas((current) =>
      current.map((idea) =>
        idea.id === id
          ? { ...idea, status }
          : idea,
      ),
    );
  }

  function remove(id: string) {
    setIdeas((current) =>
      current.filter(
        (idea) => idea.id !== id,
      ),
    );
  }

  return (
    <section className="ideas-wrap">
      <div className="page-head ideas-head">
        <div>
          <div className="eyebrow">
            Project scratchpad
          </div>

          <h1>Idea Log</h1>

          <p className="subtitle">
            Add it. Keep it open. Finish
            it or get it out of the way.
          </p>
        </div>

        <div className="page-summary">
          <span className="chip good">
            {counts.active} open
          </span>

          <span className="chip">
            {counts.done} completed
          </span>
        </div>
      </div>

      <section className="card">
        <form
          className="idea-compose"
          onSubmit={addIdea}
        >
          <input
            className="idea-input"
            value={text}
            onChange={(event) =>
              setText(
                event.target.value,
              )
            }
            placeholder="Add an idea…"
          />

          <button
            type="submit"
            className="builder-primary"
          >
            Add idea
          </button>
        </form>

        <div className="idea-filterbar">
          {(
            [
              ["active", "Open"],
              ["done", "Completed"],
              ["trash", "Trash"],
              ["all", "All"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`idea-filter ${
                filter === key
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFilter(key)
              }
            >
              {label}
              <span className="idea-filter-count">
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        <div className="idea-list">
          {visible.length ? (
            visible.map((idea) => (
              <div
                key={idea.id}
                className={`idea-row ${
                  idea.status
                }`}
              >
                <button
                  type="button"
                  className="idea-check"
                  disabled={
                    idea.status === "trash"
                  }
                  onClick={() =>
                    update(
                      idea.id,
                      idea.status === "done"
                        ? "active"
                        : "done",
                    )
                  }
                  aria-label={
                    idea.status === "done"
                      ? "Reopen idea"
                      : "Complete idea"
                  }
                >
                  ✓
                </button>

                <div className="idea-text">
                  {idea.text}
                </div>

                <div className="idea-actions">
                  {idea.status ===
                  "trash" ? (
                    <>
                      <button
                        type="button"
                        className="idea-action"
                        onClick={() =>
                          update(
                            idea.id,
                            "active",
                          )
                        }
                      >
                        Restore
                      </button>

                      <button
                        type="button"
                        className="idea-action danger"
                        onClick={() =>
                          remove(idea.id)
                        }
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="idea-action danger"
                      onClick={() =>
                        update(
                          idea.id,
                          "trash",
                        )
                      }
                    >
                      Trash
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="idea-empty">
              <strong>Nothing here.</strong>
              <span>
                {filter === "active"
                  ? "Add an idea above."
                  : "Nothing in this view."}
              </span>
            </div>
          )}
        </div>

        <div className="idea-footer">
          <span>
            Open ideas stay in front.
          </span>
          <span>
            {visible.length} shown
          </span>
        </div>
      </section>
    </section>
  );
}
