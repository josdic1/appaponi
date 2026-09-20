import {
  Box,
  Button,
  HStack,
} from "@chakra-ui/react";
import type {
  LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type AppSectionRailItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  active?: boolean;
  onClick?: () => void;
  targetId?: string;
};

type Props = {
  items: AppSectionRailItem[];
  label?: string;
  desktopRail?: boolean;
};

export default function AppSectionRail({
  items,
  label = "Page sections",
  desktopRail = false,
}: Props) {
  const [observedActiveId, setObservedActiveId] =
    useState<string | null>(null);

  const frameRef =
    useRef<number | null>(null);

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
        window.innerWidth <= 900
          ? 128
          : 96;

      const targets = targetItems
        .map((item) => ({
          item,
          element:
            document.getElementById(
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
        window.innerHeight +
          window.scrollY >=
        document.documentElement
          .scrollHeight -
          4
      ) {
        setObservedActiveId(
          targets.at(-1)!.item.id,
        );
        return;
      }

      const passed =
        targets.filter(
          ({ element }) =>
            element.getBoundingClientRect()
              .top <= stickyOffset,
        );

      setObservedActiveId(
        (passed.at(-1) ?? targets[0])
          .item.id,
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
      overflowX={{
        base: "auto",
        lg: desktopRail
          ? "visible"
          : "auto",
      }}
      borderBottomWidth={{
        base: "1px",
        lg: desktopRail
          ? "0"
          : "1px",
      }}
      borderColor="gray.200"
      bg="white"
      px={{
        base: "0",
        lg: desktopRail
          ? "0"
          : "6",
      }}
      py={{
        base: "2",
        lg: desktopRail
          ? "6"
          : "2",
      }}
      position={{
        base: "static",
        lg: desktopRail
          ? "sticky"
          : "static",
      }}
      top={{
        lg: desktopRail
          ? "72px"
          : undefined,
      }}
    >
      <HStack
        gap={{
          base: "1",
          lg: desktopRail
            ? "1"
            : "1",
        }}
        minW={{
          base: "max-content",
          lg: desktopRail
            ? "0"
            : "max-content",
        }}
        flexDirection={{
          base: "row",
          lg: desktopRail
            ? "column"
            : "row",
        }}
        alignItems={{
          base: "center",
          lg: desktopRail
            ? "stretch"
            : "center",
        }}
      >
        {items.map((item) => {
          const isActive =
            item.active ??
            (item.targetId
              ? observedActiveId ===
                item.id
              : false);

          const Icon = item.icon;

          return (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant="ghost"
              justifyContent={
                desktopRail
                  ? "flex-start"
                  : "center"
              }
              gap="2"
              px="3"
              color={
                isActive
                  ? "green.700"
                  : "gray.600"
              }
              bg={
                isActive
                  ? "green.50"
                  : "transparent"
              }
              borderLeftWidth={{
                base: "0",
                lg: desktopRail
                  ? "2px"
                  : "0",
              }}
              borderLeftColor={
                isActive
                  ? "green.600"
                  : "transparent"
              }
              borderRadius="md"
              aria-current={
                isActive
                  ? "location"
                  : undefined
              }
              _hover={{
                bg: isActive
                  ? "green.50"
                  : "gray.50",
                color: isActive
                  ? "green.700"
                  : "gray.800",
              }}
              onClick={() =>
                activate(item)
              }
            >
              {Icon && (
                <Icon
                  size={15}
                  strokeWidth={1.8}
                />
              )}

              {item.label}
            </Button>
          );
        })}
      </HStack>
    </Box>
  );
}
