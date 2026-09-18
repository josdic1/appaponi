import {
  Box,
  Button,
} from "@chakra-ui/react";
import { useState } from "react";

import { MataponiLoader } from "./MataponiLoader";

export function MataponiLoaderEasterEgg() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Box
        display="flex"
        justifyContent="center"
        py="1"
      >
        <Button
          type="button"
          variant="ghost"
          size="xs"
          colorPalette="gray"
          color="gray.500"
          aria-label="Camp Mataponi"
          onClick={() => setOpen(true)}
        >
          Camp Mataponi
        </Button>
      </Box>

      {open && (
        <MataponiLoader
          interactive
          onExit={() => setOpen(false)}
        />
      )}
    </>
  );
}
