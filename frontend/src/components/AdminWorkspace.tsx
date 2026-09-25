import {
  Box,
  Grid,
  Stack,
} from "@chakra-ui/react";
import type {
  ReactNode,
} from "react";

import AppSectionStack from "./AppSectionStack";
import type {
  AppSectionRailItem,
} from "./AppSectionRail";

type Props = {
  sections: AppSectionRailItem[];
  brand?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export default function AdminWorkspace({
  sections,
  brand,
  footer,
  children,
}: Props) {
  return (
    <Grid
      w="full"
      maxW="1440px"
      mx="auto"
      gridTemplateColumns={{
        base: "1fr",
        lg: "220px minmax(0, 1fr)",
      }}
      gap="0"
    >
      <Box
        as="aside"
        aria-label="Admin navigation"
        bg="white"
        borderRightWidth={{
          base: "0",
          lg: "1px",
        }}
        borderBottomWidth={{
          base: "1px",
          lg: "0",
        }}
        borderColor="gray.200"
        position={{
          base: "static",
          lg: "sticky",
        }}
        top={{ lg: "0" }}
        h={{ lg: "100vh" }}
        alignSelf="start"
        zIndex="sticky"
      >
        <Stack
          h="full"
          gap="0"
        >
          {brand && (
            <Box
              display={{
                base: "none",
                lg: "block",
              }}
              p="4"
              borderBottomWidth="1px"
              borderColor="gray.100"
            >
              {brand}
            </Box>
          )}

          <Box
            flex="1"
            minH="0"
          >
            <AppSectionStack
              label="Admin sections"
              items={sections}
              desktopRail
            />
          </Box>

          {footer && (
            <Box
              display={{
                base: "none",
                lg: "block",
              }}
              p="4"
              borderTopWidth="1px"
              borderColor="gray.100"
            >
              {footer}
            </Box>
          )}
        </Stack>
      </Box>

      <Box
        minW="0"
        px={{
          base: "16px",
          md: "24px",
        }}
        py={{
          base: "16px",
          md: "20px",
        }}
      >
        {children}
      </Box>
    </Grid>
  );
}
