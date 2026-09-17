import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

import loaderImage from "../../assets/brand/mataponi-loader-source.png";
import "./MataponiLoader.css";

type Props = {
  interactive?: boolean;
  exitOnPointerMove?: boolean;
  hideCursor?: boolean;
  onExit?: () => void;
  onActivateInteractive?: () => void;
};

type LoaderStyle = CSSProperties & {
  "--loader-swing-duration": string;
  "--loader-arc-start": string;
  "--loader-arc-end": string;
};

export function MataponiLoader({
  interactive = false,
  exitOnPointerMove = false,
  hideCursor = false,
  onExit,
  onActivateInteractive,
}: Props) {
  const [speed, setSpeed] = useState(2.35);
  const [arc, setArc] = useState(0.72);
  const [controlsVisible, setControlsVisible] = useState(false);
  const controlsTimerRef = useRef<number | null>(null);
  const pointerExitArmedAtRef = useRef(0);

  useEffect(() => {
    pointerExitArmedAtRef.current = performance.now() + 420;

    return () => {
      if (controlsTimerRef.current !== null) {
        window.clearTimeout(controlsTimerRef.current);
      }
    };
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

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [interactive, onExit]);

  function revealControls() {
    if (!interactive) {
      return;
    }

    setControlsVisible(true);

    if (controlsTimerRef.current !== null) {
      window.clearTimeout(controlsTimerRef.current);
    }

    controlsTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 1500);
  }

  function keepControlsVisible() {
    if (controlsTimerRef.current !== null) {
      window.clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
    setControlsVisible(true);
  }

  function handlePointerMove() {
    if (
      exitOnPointerMove &&
      performance.now() >= pointerExitArmedAtRef.current
    ) {
      onExit?.();
      return;
    }

    revealControls();
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

  const loaderStyle: LoaderStyle = {
    "--loader-swing-duration": `${speed}s`,
    "--loader-arc-start": `${-arc}deg`,
    "--loader-arc-end": `${arc}deg`,
  };

  return (
    <div
      className={`loader-overlay${hideCursor ? " loader-overlay--cursorless" : ""}${interactive ? " loader-overlay--interactive" : ""}`}
      role={interactive ? "dialog" : "status"}
      aria-label={interactive ? "Camp Mataponi loader playground" : "Loading"}
      aria-modal={interactive ? true : undefined}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
    >
      {interactive && (
        <button
          type="button"
          className="mataponi-loader-close"
          aria-label="Close Camp Mataponi loader"
          onClick={() => onExit?.()}
        >
          ×
        </button>
      )}

      <svg
        width="0"
        height="0"
        aria-hidden="true"
        focusable="false"
        style={{ position: "absolute" }}
      >
        <filter id="mataponi-green" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="linear" slope="1" intercept="0" />
            <feFuncG type="linear" slope=".529412" intercept=".470588" />
            <feFuncB type="linear" slope=".670588" intercept=".329412" />
            <feFuncA type="identity" />
          </feComponentTransfer>
        </filter>
      </svg>

      <div className="mataponi-loader" style={loaderStyle}>
        <img
          className="mataponi-loader__hardware"
          src={loaderImage}
          alt=""
        />

        <div className="mataponi-loader__sign">
          <img src={loaderImage} alt="" />
        </div>
      </div>

      {interactive && (
        <div
          className={`mataponi-loader-controls${controlsVisible ? " visible" : ""}`}
          onPointerEnter={keepControlsVisible}
          onPointerMove={keepControlsVisible}
          onPointerLeave={revealControls}
        >
          <label>
            <span>Speed</span>
            <input
              type="range"
              min="0.7"
              max="4.5"
              step="0.05"
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
              aria-label="Swing speed"
            />
          </label>

          <label>
            <span>Arc</span>
            <input
              type="range"
              min="0.2"
              max="4"
              step="0.05"
              value={arc}
              onChange={(event) => setArc(Number(event.target.value))}
              aria-label="Swing arc"
            />
          </label>

          <button type="button" onClick={() => onExit?.()}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}
