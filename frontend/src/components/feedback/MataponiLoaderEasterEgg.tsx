import { useState } from "react";

import loaderImage from "../../assets/brand/mataponi-loader-source.png";
import { MataponiLoader } from "./MataponiLoader";

export function MataponiLoaderEasterEgg() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="mataponi-easter-egg"
        aria-label="Camp Mataponi"
        onClick={() => setOpen(true)}
      >
        <svg
          width="0"
          height="0"
          aria-hidden="true"
          focusable="false"
          style={{ position: "absolute" }}
        >
          <filter id="mataponi-easter-green" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="linear" slope="1" intercept="0" />
              <feFuncG type="linear" slope=".529412" intercept=".470588" />
              <feFuncB type="linear" slope=".670588" intercept=".329412" />
              <feFuncA type="identity" />
            </feComponentTransfer>
          </filter>
        </svg>

        <span className="mataponi-easter-egg__art" aria-hidden="true">
          <img
            className="mataponi-easter-egg__hardware"
            src={loaderImage}
            alt=""
          />

          <span className="mataponi-easter-egg__sign">
            <img src={loaderImage} alt="" />
          </span>
        </span>
      </button>

      {open && (
        <MataponiLoader
          interactive
          onExit={() => setOpen(false)}
        />
      )}
    </>
  );
}
