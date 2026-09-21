import {
  Box,
  Grid,
} from "@chakra-ui/react";
import type { ReactNode } from "react";

import AppSectionRail, {
  type AppSectionRailItem,
} from "./AppSectionRail";

type Props = {
  items: AppSectionRailItem[];
  label?: string;
  children: ReactNode;
};

export default function PageSectionLayout({
  items,
  label = "Page sections",
  children,
}: Props) {
  if (items.length < 2) {
    return <Box minW="0">{children}</Box>;
  }

  return (
    <Grid
      templateColumns={{
        base: "1fr",
        lg: "max-content minmax(0, 1fr)",
      }}
      gap="3"
      alignItems="start"
      minW="0"
    >
      <Box minW="0">
        <AppSectionRail
          items={items}
          label={label}
          desktopRail
          compactRail
        />
      </Box>

      <Box minW="0">
        {children}
      </Box>
    </Grid>
  );
}
