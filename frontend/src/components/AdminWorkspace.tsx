import {
  Box,
  Grid,
} from "@chakra-ui/react";

import AppSectionStack from "./AppSectionStack";
import type {
  AppSectionRailItem,
} from "./AppSectionRail";

type Props = {
  sections: AppSectionRailItem[];
  children: React.ReactNode;
};

export default function AdminWorkspace({
  sections,
  children,
}: Props) {
  return (
    <Grid
      w="full"
      maxW="1440px"
      mx="auto"
      gridTemplateColumns={{
        base: "1fr",
        lg: "176px minmax(0, 1fr)",
      }}
      gap={{ base: "0", lg: "24px" }}
      px={{ base: "16px", md: "24px" }}
    >
      <Box>
        <AppSectionStack
          label="Admin sections"
          items={sections}
          desktopRail
        />
      </Box>

      <Box
        minW="0"
        py={{ base: "20px", md: "28px" }}
      >
        {children}
      </Box>
    </Grid>
  );
}
