import {
  Box,
  Button,
  Image,
} from "@chakra-ui/react";

import { keyframes } from "@emotion/react";

import {
  useEffect,
  useRef,
  type PointerEvent,
} from "react";

import loaderImage from "../../assets/brand/mataponi-loader-source.png";

const signSwing = keyframes`
  0% {
    transform: rotate(-9deg);
  }

  50% {
    transform: rotate(9deg);
  }

  100% {
    transform: rotate(-9deg);
  }
`;

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
  hideCursor = false,
  onExit,
  onActivateInteractive,
}: Props) {
  const pointerExitArmedAtRef = useRef(0);

  useEffect(() => {
    pointerExitArmedAtRef.current =
      performance.now() + 420;
  }, []);

  useEffect(() => {
    if (!interactive) {
      return;
    }

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
      position="fixed"
      inset="0"
      zIndex="modal"
      minH="100dvh"
      display="grid"
      placeItems="center"
      bg={
        interactive
          ? "blackAlpha.600"
          : "#f6f5f1"
      }
      cursor={
        hideCursor ? "none" : undefined
      }
      overflow="hidden"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
    >
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        focusable="false"
      >
        <filter
          id="mataponi-green"
          colorInterpolationFilters="sRGB"
        >
          <feComponentTransfer>
            <feFuncR
              type="linear"
              slope="1"
              intercept="0"
            />
            <feFuncG
              type="linear"
              slope=".529412"
              intercept=".470588"
            />
            <feFuncB
              type="linear"
              slope=".670588"
              intercept=".329412"
            />
            <feFuncA type="identity" />
          </feComponentTransfer>
        </filter>
      </svg>

      <Box
        position="relative"
        w={{
          base: "220px",
          md: "280px",
        }}
        userSelect="none"
      >
        <Image
          src={loaderImage}
          alt=""
          aria-hidden="true"
          w="full"
          display="block"
          visibility="hidden"
        />

        <Image
          src={loaderImage}
          alt=""
          position="absolute"
          inset="0"
          w="full"
          h="full"
          objectFit="contain"
          clipPath="inset(0 0 75.5% 0)"
          pointerEvents="none"
        />

        <Box
          position="absolute"
          inset="0"
          transformOrigin="50% 24%"
          pointerEvents="none"
          willChange="transform"
          animation={`${signSwing} 1.45s ease-in-out infinite`}
        >
          <Image
            src={loaderImage}
            alt=""
            w="full"
            h="full"
            objectFit="contain"
            clipPath="inset(24% 0 0 0)"
            filter="url(#mataponi-green)"
          />
        </Box>
      </Box>

      {interactive && (
        <Button
          type="button"
          position="fixed"
          top="5"
          right="5"
          size="sm"
          variant="solid"
          colorPalette="green"
          onClick={() => onExit?.()}
        >
          Done
        </Button>
      )}
    </Box>
  );
}
