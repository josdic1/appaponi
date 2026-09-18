import { useState } from "react";

import { MataponiLoader } from "./MataponiLoader";

export function MataponiLoaderEasterEgg() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Camp Mataponi"
        onClick={() => setOpen(true)}
      >
        Camp Mataponi
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
