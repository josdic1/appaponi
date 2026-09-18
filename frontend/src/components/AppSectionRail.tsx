import {
  Box,
  Button,
  HStack,
} from "@chakra-ui/react";
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
    <Box
      as="aside"
      aria-label={label}
      w="full"
      overflowX="auto"
      borderBottomWidth="1px"
      borderColor="gray.200"
      bg="white"
      px={{ base: "3", md: "6" }}
      py="2"
    >
      <HStack
        gap="1"
        minW="max-content"
      >
        {items.map((item) => {
          const isActive =
            item.active ??
            (item.targetId
              ? observedActiveId === item.id
              : false);

          return (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={
                isActive
                  ? "solid"
                  : "ghost"
              }
              colorPalette={
                isActive
                  ? "green"
                  : "gray"
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
            </Button>
          );
        })}
      </HStack>
    </Box>
  );
}
