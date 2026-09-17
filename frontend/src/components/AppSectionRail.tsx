import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type AppSectionRailItem = {
  id: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  targetId?: string;
};

type Props = {
  items: AppSectionRailItem[];
  label?: string;
};

export default function AppSectionRail({
  items,
  label = "Page sections",
}: Props) {
  const [observedActiveId, setObservedActiveId] =
    useState<string | null>(null);
  const frameRef = useRef<number | null>(null);

  const targetItems = useMemo(
    () =>
      items.filter(
        (item) => item.targetId,
      ),
    [items],
  );

  useEffect(() => {
    if (!targetItems.length) {
      return;
    }

    function updateActiveSection() {
      frameRef.current = null;

      const stickyOffset =
        window.innerWidth <= 900 ? 128 : 96;

      const targets = targetItems
        .map((item) => ({
          item,
          element: document.getElementById(
            item.targetId!,
          ),
        }))
        .filter(
          (
            entry,
          ): entry is {
            item: AppSectionRailItem;
            element: HTMLElement;
          } => Boolean(entry.element),
        );

      if (!targets.length) {
        return;
      }

      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4
      ) {
        setObservedActiveId(
          targets.at(-1)!.item.id,
        );
        return;
      }

      const passed = targets.filter(
        ({ element }) =>
          element.getBoundingClientRect().top <=
          stickyOffset,
      );

      setObservedActiveId(
        (passed.at(-1) ?? targets[0]).item.id,
      );
    }

    function scheduleUpdate() {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current =
        window.requestAnimationFrame(
          updateActiveSection,
        );
    }

    scheduleUpdate();
    window.addEventListener(
      "scroll",
      scheduleUpdate,
      { passive: true },
    );
    window.addEventListener(
      "resize",
      scheduleUpdate,
    );

    return () => {
      window.removeEventListener(
        "scroll",
        scheduleUpdate,
      );
      window.removeEventListener(
        "resize",
        scheduleUpdate,
      );

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(
          frameRef.current,
        );
      }
    };
  }, [targetItems]);

  function activate(
    item: AppSectionRailItem,
  ) {
    item.onClick?.();

    if (item.targetId) {
      setObservedActiveId(item.id);

      window.requestAnimationFrame(
        () => {
          document
            .getElementById(
              item.targetId!,
            )
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
        },
      );
    }
  }

  return (
    <aside
      className="app-section-rail"
      aria-label={label}
    >
      {items.map((item) => {
        const isActive =
          item.active ??
          (item.targetId
            ? observedActiveId === item.id
            : false);

        return (
          <button
            type="button"
            key={item.id}
            className={
              isActive
                ? "active"
                : ""
            }
            aria-current={
              isActive
                ? "location"
                : undefined
            }
            onClick={() =>
              activate(item)
            }
          >
            {item.label}
          </button>
        );
      })}
    </aside>
  );
}
