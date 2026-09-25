import {
  Badge,
  Box,
  Grid,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  BedDouble,
  BellRing,
  BookOpenText,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  ListChecks,
  UtensilsCrossed,
  UserRoundCog,
  UsersRound,
} from "lucide-react";

import {
  AdminPageHeader,
} from "../components/AdminUi";

type StepProps = {
  number: string;
  title: string;
  detail: string;
};

function Step({
  number,
  title,
  detail,
}: StepProps) {
  return (
    <HStack
      alignItems="flex-start"
      gap="3"
      py="3"
      borderBottomWidth="1px"
      borderColor="gray.100"
      _last={{
        borderBottomWidth: "0",
      }}
    >
      <Box
        w="7"
        h="7"
        flexShrink="0"
        display="grid"
        placeItems="center"
        borderRadius="full"
        bg="green.50"
        color="green.700"
        fontSize="xs"
        fontWeight="800"
      >
        {number}
      </Box>

      <Stack gap="0">
        <Text fontWeight="800">
          {title}
        </Text>

        <Text
          fontSize="sm"
          color="gray.600"
        >
          {detail}
        </Text>
      </Stack>
    </HStack>
  );
}

type StarterProps = {
  label: string;
  route: string;
  detail: string;
  tone?: "green" | "gray";
};

function Starter({
  label,
  route,
  detail,
  tone = "gray",
}: StarterProps) {
  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      bg="white"
      p="4"
    >
      <HStack
        justifyContent="space-between"
        alignItems="flex-start"
        gap="3"
      >
        <Text fontWeight="800">
          {label}
        </Text>

        <Badge
          colorPalette={
            tone === "green"
              ? "green"
              : "gray"
          }
          variant="subtle"
        >
          {route}
        </Badge>
      </HStack>

      <Text
        mt="2"
        fontSize="sm"
        color="gray.600"
      >
        {detail}
      </Text>
    </Box>
  );
}

const adminFlow = [
  {
    icon: CalendarDays,
    title: "Event HQ",
    detail:
      "Create or select the event. Event-specific work starts from the current event.",
  },
  {
    icon: UsersRound,
    title: "Accounts",
    detail:
      "Create household logins and manage the people inside each household.",
  },
  {
    icon: UserRoundCog,
    title: "Staff",
    detail:
      "Create staff profiles and maintain the people working the event.",
  },
  {
    icon: ClipboardList,
    title: "Operations",
    detail:
      "Maintain reusable places, activities, qualifications, cabins, and other setup.",
  },
  {
    icon: CalendarRange,
    title: "Scheduling",
    detail:
      "Put activities on this event's calendar and assign staff.",
  },
  {
    icon: BedDouble,
    title: "Guests + cabins",
    detail:
      "Register households, inspect household details, move cabins, and use the cabin map.",
  },
  {
    icon: UtensilsCrossed,
    title: "Meal planning",
    detail:
      "Choose a saved menu, load the Family Camp Menu starter, and build food services.",
  },
  {
    icon: BellRing,
    title: "Services",
    detail:
      "See and manage guest service requests such as food and babysitting.",
  },
];

export default function AdminWalkthroughPage() {
  return (
    <Box
      data-testid="admin-walkthrough-page"
      w="full"
      maxW="1080px"
    >
      <Stack gap="7">
        <AdminPageHeader
          eyebrow="Help"
          title="Walkthrough"
          description="Use this when you are not sure where to go. This page only explains the app; it does not change data."
        />

        <Box>
          <HStack
            mb="3"
            gap="2"
          >
            <BookOpenText
              size={17}
              strokeWidth={1.8}
            />

            <Text
              fontWeight="800"
              fontSize="lg"
            >
              Start with the amount of data you want
            </Text>
          </HStack>

          <Grid
            templateColumns={{
              base: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
            }}
            gap="3"
          >
            <Starter
              label="Full working demo"
              route="DEV → Alumni Weekend"
              tone="green"
              detail="Loads a complete Alumni Weekend with staff, households, cabins, scheduled activities, activity sign-ups, meals, food orders, babysitting, and notifications. Existing staff, members, and event instances are cleared first. Reusable setup stays. Today becomes Day 1."
            />

            <Starter
              label="Menu only"
              route="Meal planning → Menu → Change"
              detail="Choose Load Family Camp Menu. The menu preset is created or reused and applied to the current event. This action does not create staff, guests, or activities."
            />

            <Starter
              label="Keep staff, clear guests + events"
              route="DEV → Clear guests + events"
              detail="Removes member households and event instances. Admin, staff, and reusable setup stay."
            />

            <Starter
              label="Clear people + events"
              route="DEV → Clear people + events"
              detail="Removes staff, member households, and event instances. Admin and reusable setup stay."
            />
          </Grid>

          <Box
            mt="3"
            px="4"
            py="3"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="lg"
            bg="gray.50"
          >
            <Text
              fontSize="sm"
              color="gray.700"
            >
              <strong>Reusable setup</strong> means things such as cabins and their permanent map locations, areas, activity definitions, qualifications, food items, saved menus, event categories, and meal types. There are no separate staff-only or activity-only preload buttons right now. The menu starter is the selective preload.
            </Text>
          </Box>
        </Box>

        <Box>
          <HStack
            mb="3"
            gap="2"
          >
            <ListChecks
              size={17}
              strokeWidth={1.8}
            />

            <Text
              fontWeight="800"
              fontSize="lg"
            >
              Build a real event
            </Text>
          </HStack>

          <Box
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="xl"
            bg="white"
            px="4"
          >
            <Step
              number="1"
              title="Create or select the event"
              detail="Event HQ is the starting point. Make sure the correct event is current before doing event-specific work."
            />
            <Step
              number="2"
              title="Prepare people"
              detail="Use Accounts for households and Staff for staff. You can skip either until you actually need those people."
            />
            <Step
              number="3"
              title="Prepare reusable setup"
              detail="Use Operations for the places, activities, qualifications, cabins, and other building blocks that can be reused across events."
            />
            <Step
              number="4"
              title="Schedule the event"
              detail="Use Scheduling to put activities on dates and times and assign staff."
            />
            <Step
              number="5"
              title="Register households and place cabins"
              detail="Guests + cabins shows registrations. Click a household for members and activity sign-ups; use Moves for quick relocation and Cabins for the visual map."
            />
            <Step
              number="6"
              title="Plan food"
              detail="Meal planning controls the event menu, food services, snacks, and after-hours offerings."
            />
            <Step
              number="7"
              title="Run the event"
              detail="Services is the operational queue for incoming guest requests. Staff and member views use the event setup you created here."
            />
          </Box>
        </Box>

        <Box>
          <Text
            mb="3"
            fontWeight="800"
            fontSize="lg"
          >
            What each admin page is for
          </Text>

          <Grid
            templateColumns={{
              base: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
            }}
            gap="3"
          >
            {adminFlow.map(
              ({
                icon: Icon,
                title,
                detail,
              }) => (
                <HStack
                  key={title}
                  alignItems="flex-start"
                  gap="3"
                  p="4"
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="xl"
                  bg="white"
                >
                  <Box
                    w="8"
                    h="8"
                    flexShrink="0"
                    display="grid"
                    placeItems="center"
                    borderRadius="md"
                    bg="gray.50"
                    color="gray.700"
                  >
                    <Icon
                      size={16}
                      strokeWidth={1.8}
                    />
                  </Box>

                  <Stack gap="0">
                    <Text fontWeight="800">
                      {title}
                    </Text>

                    <Text
                      fontSize="sm"
                      color="gray.600"
                    >
                      {detail}
                    </Text>
                  </Stack>
                </HStack>
              ),
            )}
          </Grid>
        </Box>

        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
          }}
          gap="3"
        >
          <Box
            p="4"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="xl"
            bg="white"
          >
            <Text fontWeight="800">
              Member view
            </Text>

            <Text
              mt="1"
              fontSize="sm"
              color="gray.600"
            >
              Today is the quick view. Itinerary is the schedule. Stay + map is lodging and camp location. Food + services is for requests. Directory shows attending households. Household manages the member's own people and event attendance.
            </Text>
          </Box>

          <Box
            p="4"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="xl"
            bg="white"
          >
            <Text fontWeight="800">
              Staff view
            </Text>

            <Text
              mt="1"
              fontSize="sm"
              color="gray.600"
            >
              Today is the work view. Now / Next / Needs action keeps the immediate workload obvious. Notices carries messages. Schedule shows assigned work. Babysitting and service work appear where staff can act on them.
            </Text>
          </Box>
        </Grid>
      </Stack>
    </Box>
  );
}
