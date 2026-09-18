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
    pointerExitArmedAtRef.current = performance.now() + 420;
  }, []);

  useEffect(() => {
    if (!interactive) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onExit?.();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [interactive, onExit]);

  function handlePointerMove() {
    if (
      exitOnPointerMove &&
      performance.now() >= pointerExitArmedAtRef.current
    ) {
      onExit?.();
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (exitOnPointerMove && onActivateInteractive) {
      event.preventDefault();
      onActivateInteractive();
      return;
    }

    if (interactive && event.target === event.currentTarget) {
      onExit?.();
    }
  }

  return (
    <div
      role={interactive ? "dialog" : "status"}
      aria-label={interactive ? "Camp Mataponi loader" : "Loading"}
      aria-modal={interactive ? true : undefined}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
    >
      <p>Loading…</p>
      {interactive && (
        <button type="button" onClick={() => onExit?.()}>
          Done
        </button>
      )}
    </div>
  );
}
