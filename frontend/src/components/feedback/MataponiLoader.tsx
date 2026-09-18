import {
  Box,
  Button,
  Text,
} from "@chakra-ui/react";
import {
  useEffect,
  useRef,
  type PointerEvent,
} from "react";

type Props = {
  interactive?: boolean;
  exitOnPointerMove?: boolean;
  hideCursor?: boolean;
  onExit?: () => void;
  onActivateInteractive?: () => void;
};

export function MataponiLoader({
  interactive = false,
  exitOnPointerMove = false,
  onExit,
  onActivateInteractive,
}: Props) {
  const pointerExitArmedAtRef = useRef(0);

  useEffect(() => {
    pointerExitArmedAtRef.current =
      performance.now() + 420;
  }, []);

  useEffect(() => {
    if (!interactive) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onExit?.();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
  }, [interactive, onExit]);

  function handlePointerMove() {
    if (
      exitOnPointerMove &&
      performance.now() >=
        pointerExitArmedAtRef.current
    ) {
      onExit?.();
    }
  }

  function handlePointerDown(
    event: PointerEvent<HTMLDivElement>,
  ) {
    if (
      exitOnPointerMove &&
      onActivateInteractive
    ) {
      event.preventDefault();
      onActivateInteractive();
      return;
    }

    if (
      interactive &&
      event.target === event.currentTarget
    ) {
      onExit?.();
    }
  }

  return (
    <Box
      role={interactive ? "dialog" : "status"}
      aria-label={
        interactive
          ? "Camp Mataponi loader"
          : "Loading"
      }
      aria-modal={
        interactive ? true : undefined
      }
      position={interactive ? "fixed" : "relative"}
      inset={interactive ? "0" : undefined}
      zIndex={interactive ? "modal" : undefined}
      minH={interactive ? "100vh" : "100%"}
      display="grid"
      placeItems="center"
      bg={interactive ? "blackAlpha.600" : "gray.50"}
      p="6"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
    >
      <Box
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="xl"
        boxShadow={interactive ? "xl" : "none"}
        px="8"
        py="6"
        textAlign="center"
      >
        <Text
          fontWeight="600"
          color="gray.700"
        >
          Loading…
        </Text>

        {interactive && (
          <Button
            type="button"
            mt="5"
            colorPalette="green"
            onClick={() => onExit?.()}
          >
            Done
          </Button>
        )}
      </Box>
    </Box>
  );
}
