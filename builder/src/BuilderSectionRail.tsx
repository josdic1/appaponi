import {
  useEffect,
  useState,
} from "react";

type Tab =
  | "data"
  | "schema"
  | "database"
  | "api"
  | "ideas"
  | "import";

type RailItem = {
  label: string;
  title: string;
  action: () => void;
};

function scrollTo(selector: string) {
  const target =
    document.querySelector(selector);

  target?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function dispatch(
  name: string,
  detail: string,
) {
  window.dispatchEvent(
    new CustomEvent(name, {
      detail,
    }),
  );
}

export default function BuilderSectionRail({
  tab,
}: {
  tab: Tab;
}) {
  const [active, setActive] =
    useState(0);

  useEffect(() => {
    setActive(0);
  }, [tab]);

  let items: RailItem[] = [];

  if (tab === "data") {
    items = [
      "People",
      "Events",
      "Camp",
      "Schedule",
      "Services",
    ].map((group) => ({
      label:
        group === "Schedule"
          ? "SCHED"
          : group === "Services"
            ? "SERV"
            : group.toUpperCase(),
      title: group,
      action: () =>
        dispatch(
          "appoponi-builder-data-group",
          group,
        ),
    }));
  }

  if (tab === "schema") {
    items = [
      {
        label: "TABLES",
        title: "Tables",
        action: () =>
          scrollTo(".schema-sidebar"),
      },
      {
        label: "DETAIL",
        title: "Selected table",
        action: () =>
          scrollTo(
            ".schema-layout > article",
          ),
      },
    ];
  }

  if (tab === "database") {
    items = [
      {
        label: "MAP",
        title: "Relationship map",
        action: () =>
          scrollTo(".database-main"),
      },
      {
        label: "TABLE",
        title: "Selected live table",
        action: () =>
          scrollTo(".database-detail"),
      },
    ];
  }

  if (tab === "api") {
    items = [
      ["SYS", "system"],
      ["AUTH", "auth"],
      ["USERS", "users"],
      ["EVENTS", "events"],
      ["CAMP", "camp"],
      ["STAFF", "staff"],
      ["SERV", "services"],
    ].map(([label, key]) => ({
      label,
      title: label,
      action: () =>
        scrollTo(`#api-group-${key}`),
    }));
  }

  if (tab === "ideas") {
    items = [
      ["OPEN", "active"],
      ["DONE", "done"],
      ["TRASH", "trash"],
      ["ALL", "all"],
    ].map(([label, filter]) => ({
      label,
      title: label,
      action: () =>
        dispatch(
          "appoponi-builder-idea-filter",
          filter,
        ),
    }));
  }

  if (!items.length) {
    return null;
  }

  return (
    <nav
      className="builder-section-rail"
      aria-label="Current section navigation"
    >
      {items.map((item, index) => (
        <button
          key={`${tab}-${item.label}`}
          type="button"
          className={
            active === index
              ? "active"
              : ""
          }
          title={item.title}
          onClick={() => {
            item.action();
            setActive(index);
          }}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
