import { Box } from "@chakra-ui/react";

import AppSectionRail, {
  type AppSectionRailItem,
} from "./AppSectionRail";
import { MataponiLoaderEasterEgg } from "./feedback/MataponiLoaderEasterEgg";

type Props = {
  items: AppSectionRailItem[];
  label?: string;
};

export default function AppSectionStack({
  items,
  label,
}: Props) {
  return (
    <Box
      w="full"
      bg="white"
    >
      <AppSectionRail
        items={items}
        label={label}
      />

      <MataponiLoaderEasterEgg />
    </Box>
  );
}
