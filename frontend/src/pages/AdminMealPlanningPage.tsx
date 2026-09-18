import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type FormEvent,
} from "react";

import {
  Alert,
  Badge,
  Box,
  Button,
  Field,
  Grid,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
} from "@chakra-ui/react";

import type { EventRecord } from "@appoponi/shared/schemas/events";
import {
  foodTagValues,
  type EventMeal,
  type FoodTag,
  type MealItem,
  type MealMenu,
  type MealMenuItem,
  type MealType,
  type MealServiceItem,
} from "@appoponi/shared/schemas/meals";
import type { FoodOffering, FoodOfferingType } from "@appoponi/shared/schemas/foodOrders";

import {
  addEventMealItem,
  applyMealMenuToEvent,
  createFoodOffering,
  createEventMeal,
  createMealItem,
  deleteFoodOffering,
  deleteEventMeal,
  loadFoodOfferings,
  loadEventMeals,
  loadMealItems,
  loadMealMenuItems,
  loadMealMenuPresets,
  loadMealMenus,
  loadMealTypes,
  moveFoodInEventMeal,
  removeFoodFromEventMeal,
  resetEventMealItems,
  seedMealMenuPreset,
  updateFoodOffering,
  updateEventMeal,
  updateMealItem,
} from "../api/services";
import { loadEvents } from "../api/operations";
import HumanDateTimeInput from "../components/HumanDateTimeInput";
import { humanDateTimeToIso } from "../lib/humanDateTime";

type Props = {
  activeEventId?: string;
  focusRequest?: {
    requestId: number;
    mealId: string;
  } | null;
};

type FoodTarget =
  | { kind: "meal"; mealId: string }
  | { kind: "offering"; offeringType: FoodOfferingType };

type DragPayload =
  | { kind: "library"; itemId: string }
  | { kind: "target"; itemId: string; assignmentId?: string };

function dayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayLabel(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function serviceTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function foodTagLabel(tag: FoodTag) {
  return tag
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function editableDateTime(value: string) {
  const date = new Date(value);
  let hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, "0");
  const meridiem = hour >= 12 ? "PM" : "AM";
  hour %= 12;
  if (hour === 0) hour = 12;
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${hour}:${minute} ${meridiem}`;
}

function eventDays(event: EventRecord | null) {
  if (!event) return [] as Array<{ key: string; date: Date }>;

  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12);
  const final = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12);
  const days: Array<{ key: string; date: Date }> = [];

  while (cursor <= final) {
    const copy = new Date(cursor);
    days.push({ key: dayKey(copy), date: copy });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export default function AdminMealPlanningPage({
  activeEventId = "",
  focusRequest = null,
}: Props) {
  const handledFocusRequest = useRef<number | null>(null);

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [mealTypes, setMealTypes] = useState<MealType[]>([]);
  const [menus, setMenus] = useState<MealMenu[]>([]);
  const [menuAssignments, setMenuAssignments] = useState<MealMenuItem[]>([]);
  const [presets, setPresets] = useState<Awaited<ReturnType<typeof loadMealMenuPresets>>>([]);
  const [meals, setMeals] = useState<EventMeal[]>([]);
  const [library, setLibrary] = useState<MealItem[]>([]);
  const [offerings, setOfferings] = useState<FoodOffering[]>([]);

  const [selectedDay, setSelectedDay] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<FoodTarget | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "breakfast" | "lunch" | "dinner" | "unused">("all");
  const [tagFilter, setTagFilter] = useState<FoodTag | "ALL">("ALL");
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dragOverComposer, setDragOverComposer] = useState(false);

  const [showFoodForm, setShowFoodForm] = useState(false);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [foodName, setFoodName] = useState("");
  const [foodDescription, setFoodDescription] = useState("");
  const [foodDietary, setFoodDietary] = useState("");
  const [foodTags, setFoodTags] = useState<FoodTag[]>([]);

  const [showMenuPicker, setShowMenuPicker] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceStart, setServiceStart] = useState("");
  const [serviceEnd, setServiceEnd] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const activeEvent = useMemo(
    () => events.find((event) => event.id === activeEventId) ?? null,
    [events, activeEventId],
  );

  const currentMenu = useMemo(
    () => menus.find((menu) => menu.id === activeEvent?.meal_menu_id) ?? null,
    [menus, activeEvent?.meal_menu_id],
  );

  const days = useMemo(() => eventDays(activeEvent), [activeEvent]);

  const visibleMeals = useMemo(
    () => meals
      .filter((meal) => meal.event_id === activeEventId && dayKey(meal.starts_at) === selectedDay)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [meals, activeEventId, selectedDay],
  );

  const currentMenuAssignments = useMemo(
    () => currentMenu
      ? menuAssignments.filter((assignment) => assignment.menu_id === currentMenu.id)
      : [],
    [menuAssignments, currentMenu],
  );

  const itemUses = useMemo(() => {
    const uses = new Map<string, Set<string>>();
    for (const assignment of currentMenuAssignments) {
      const set = uses.get(assignment.item_id) ?? new Set<string>();
      if (assignment.meal_type_name) {
        set.add(assignment.meal_type_name.toLowerCase());
      }
      uses.set(assignment.item_id, set);
    }
    return uses;
  }, [currentMenuAssignments]);

  const visibleLibrary = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return library.filter((item) => {
      const matchesSearch =
        !needle ||
        [
          item.name,
          item.description ?? "",
          item.dietary_notes ?? "",
          ...item.tags.map(foodTagLabel),
        ].some((value) =>
          value.toLowerCase().includes(needle),
        );

      if (!matchesSearch) return false;

      if (
        tagFilter !== "ALL" &&
        !item.tags.includes(tagFilter)
      ) {
        return false;
      }

      const uses =
        itemUses.get(item.id) ??
        new Set<string>();

      if (filter === "unused") {
        return !itemUses.has(item.id);
      }

      if (filter !== "all") {
        return uses.has(filter);
      }

      return true;
    });
  }, [library, search, filter, tagFilter, itemUses]);

  const selectedMeal = selectedTarget?.kind === "meal"
    ? meals.find((meal) => meal.id === selectedTarget.mealId) ?? null
    : null;

  const selectedTargetItems = useMemo(() => {
    if (selectedTarget?.kind === "meal") {
      return [...(selectedMeal?.items ?? [])].sort((a, b) => a.sort_order - b.sort_order || Number(a.item_id) - Number(b.item_id));
    }

    if (selectedTarget?.kind === "offering") {
      return offerings
        .filter((item) => item.offering_type === selectedTarget.offeringType)
        .sort((a, b) => a.sort_order - b.sort_order || Number(a.id) - Number(b.id));
    }

    return [];
  }, [selectedTarget, selectedMeal, offerings]);

  const selectedTargetTitle = selectedTarget?.kind === "offering"
    ? selectedTarget.offeringType === "SNACK" ? "Snacks" : "After-hours"
    : selectedMeal
      ? selectedMeal.title ?? selectedMeal.meal_type_name
      : "Food service";

  const selectedTargetMeta = selectedTarget?.kind === "offering"
    ? selectedTarget.offeringType === "SNACK"
      ? "Event-wide · pickup"
      : "Event-wide · pickup or delivery"
    : selectedMeal
      ? `${dayLabel(selectedMeal.starts_at)} · ${serviceTime(selectedMeal.starts_at)}`
      : "";

  async function refresh() {
    const [nextEvents, nextTypes, nextMenus, nextAssignments, nextPresets, nextMeals, nextLibrary] = await Promise.all([
      loadEvents(),
      loadMealTypes(),
      loadMealMenus(),
      loadMealMenuItems(),
      loadMealMenuPresets(),
      loadEventMeals(activeEventId || undefined),
      loadMealItems(),
    ]);

    const nextOfferings = activeEventId
      ? await loadFoodOfferings(activeEventId)
      : [];

    setEvents(nextEvents);
    setMealTypes(nextTypes);
    setMenus(nextMenus);
    setMenuAssignments(nextAssignments);
    setPresets(nextPresets);
    setMeals(nextMeals);
    setLibrary(nextLibrary);
    setOfferings(nextOfferings);
  }

  useEffect(() => {
    void refresh().catch((err) => setError(err instanceof Error ? err.message : "Could not load meal planning"));
  }, [activeEventId]);

  useEffect(() => {
    if (!days.length) {
      setSelectedDay("");
      return;
    }

    const today = dayKey(new Date());
    setSelectedDay((current) => {
      if (days.some((day) => day.key === current)) return current;
      return days.some((day) => day.key === today) ? today : days[0].key;
    });
  }, [activeEvent?.id, days.length]);

  useEffect(() => {
    if (!composerOpen || !selectedTarget) return;

    if (selectedTarget.kind === "meal") {
      const meal = meals.find((item) => item.id === selectedTarget.mealId);
      if (!meal) {
        setComposerOpen(false);
        setMobileSheetOpen(false);
        setSelectedTarget(null);
      }
    }
  }, [meals, composerOpen, selectedTarget]);

  useEffect(() => {
    if (
      !focusRequest ||
      handledFocusRequest.current === focusRequest.requestId
    ) {
      return;
    }

    const meal = meals.find(
      (item) =>
        item.id === focusRequest.mealId &&
        item.event_id === activeEventId,
    );

    if (!meal) {
      return;
    }

    handledFocusRequest.current = focusRequest.requestId;
    setSelectedDay(dayKey(meal.starts_at));
    openComposer({
      kind: "meal",
      mealId: meal.id,
    });
  }, [focusRequest, meals, activeEventId]);


  async function run(action: () => Promise<unknown>, message?: string) {
    setError(null);
    setStatus(null);
    try {
      await action();
      await refresh();
      if (message) setStatus(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  function openComposer(target: FoodTarget) {
    setSelectedTarget(target);
    setComposerOpen(true);
    setMobileSheetOpen(false);
    setSearch("");
    setTagFilter("ALL");

    if (target.kind === "meal") {
      const meal = meals.find((item) => item.id === target.mealId);
      const mealName = meal?.meal_type_name.toLowerCase();
      setFilter(mealName === "breakfast" || mealName === "lunch" || mealName === "dinner" ? mealName : "all");
      return;
    }

    setFilter("all");
  }

  function closeComposer() {
    setComposerOpen(false);
    setMobileSheetOpen(false);
    setSelectedTarget(null);
    setDragOverComposer(false);
    setDragOverItemId(null);
  }

  function writeDrag(event: ReactDragEvent<HTMLElement>, payload: DragPayload) {
    const raw = JSON.stringify(payload);
    event.dataTransfer.effectAllowed = payload.kind === "library" ? "copy" : "move";
    event.dataTransfer.setData("application/x-appoponi-food", raw);
    event.dataTransfer.setData("text/plain", raw);
  }

  function readDrag(event: ReactDragEvent<HTMLElement>): DragPayload | null {
    const raw = event.dataTransfer.getData("application/x-appoponi-food") || event.dataTransfer.getData("text/plain");
    if (!raw) return null;

    try {
      const payload = JSON.parse(raw) as DragPayload;
      if (payload.kind === "library" && typeof payload.itemId === "string") return payload;
      if (payload.kind === "target" && typeof payload.itemId === "string") return payload;
    } catch {
      return null;
    }

    return null;
  }

  function addFood(itemId: string, sortOrder?: number) {
    if (!selectedTarget || !activeEventId) {
      setError("Choose a food service first.");
      return;
    }

    if (selectedTarget.kind === "meal") {
      const meal = meals.find((item) => item.id === selectedTarget.mealId);
      if (meal?.items.some((item) => item.item_id === itemId)) {
        setStatus("That food is already in this service.");
        return;
      }

      void run(
        () => addEventMealItem(selectedTarget.mealId, itemId, sortOrder),
        "Food added.",
      );
      return;
    }

    if (selectedTarget.kind !== "offering") return;

    if (offerings.some((item) => item.offering_type === selectedTarget.offeringType && item.item_id === itemId)) {
      setStatus(`That food is already in ${selectedTarget.offeringType === "SNACK" ? "Snacks" : "After-hours"}.`);
      return;
    }

    void run(
      () => createFoodOffering({
        event_id: Number(activeEventId),
        item_id: Number(itemId),
        offering_type: selectedTarget.offeringType,
        ...(sortOrder == null ? {} : { sort_order: sortOrder }),
      }),
      `Food added to ${selectedTarget.offeringType === "SNACK" ? "Snacks" : "After-hours"}.`,
    );
  }

  function removeFood(itemId: string, assignmentId?: string) {
    if (!selectedTarget) return;

    if (selectedTarget.kind === "meal") {
      void run(() => removeFoodFromEventMeal(selectedTarget.mealId, itemId), "Food removed.");
      return;
    }

    if (assignmentId) {
      void run(() => deleteFoodOffering(assignmentId), "Food removed.");
    }
  }

  function moveFood(itemId: string, assignmentId: string | undefined, sortOrder: number) {
    if (!selectedTarget) return;

    if (selectedTarget.kind === "meal") {
      void run(() => moveFoodInEventMeal(selectedTarget.mealId, itemId, sortOrder), "Order updated.");
      return;
    }

    if (assignmentId) {
      void run(() => updateFoodOffering(assignmentId, { sort_order: sortOrder }), "Order updated.");
    }
  }

  function dropIntoComposer(event: ReactDragEvent<HTMLElement>, beforeItem?: MealServiceItem | FoodOffering) {
    event.preventDefault();
    event.stopPropagation();
    setDragOverComposer(false);
    setDragOverItemId(null);

    const payload = readDrag(event);
    if (!payload) return;

    const beforeSortOrder = beforeItem?.sort_order;
    const sortOrder = beforeSortOrder == null
      ? (selectedTargetItems.length ? Math.max(...selectedTargetItems.map((item) => item.sort_order)) + 10 : 10)
      : beforeSortOrder - 1;

    if (payload.kind === "library") {
      addFood(payload.itemId, sortOrder);
      return;
    }

    moveFood(payload.itemId, payload.assignmentId, sortOrder);
  }

  function submitFood(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      if (editingFoodId) {
        await updateMealItem(editingFoodId, {
          name: foodName,
          description: foodDescription || null,
          dietary_notes: foodDietary || null,
          tags: foodTags,
        });
      } else {
        await createMealItem({
          name: foodName,
          description: foodDescription || undefined,
          dietary_notes: foodDietary || undefined,
          tags: foodTags,
        });
      }

      setShowFoodForm(false);
      setEditingFoodId(null);
      setFoodName("");
      setFoodDescription("");
      setFoodDietary("");
      setFoodTags([]);
    }, editingFoodId ? "Food saved." : "Food added to library.");
  }

  function editFood(item: MealItem) {
    setEditingFoodId(item.id);
    setFoodName(item.name);
    setFoodDescription(item.description ?? "");
    setFoodDietary(item.dietary_notes ?? "");
    setFoodTags(item.tags);
    setShowFoodForm(true);
  }

  function openNewService() {
    if (!activeEvent) return;
    const lunch = mealTypes.find((type) => type.name === "Lunch") ?? mealTypes[0];
    const date = days.find((day) => day.key === selectedDay)?.date ?? new Date(activeEvent.starts_at);
    const start = new Date(date);
    start.setHours(12, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setEditingMealId(null);
    setServiceTypeId(lunch?.id ?? "");
    setServiceTitle("");
    setServiceStart(editableDateTime(start.toISOString()));
    setServiceEnd(editableDateTime(end.toISOString()));
    setShowServiceForm(true);
  }

  function editService(meal: EventMeal) {
    closeComposer();
    setEditingMealId(meal.id);
    setServiceTypeId(meal.meal_type_id);
    setServiceTitle(meal.title ?? "");
    setServiceStart(editableDateTime(meal.starts_at));
    setServiceEnd(editableDateTime(meal.ends_at));
    setShowServiceForm(true);
  }

  function submitService(event: FormEvent) {
    event.preventDefault();
    if (!activeEvent || !serviceTypeId || !serviceStart || !serviceEnd) {
      setError("Service type, start, and end are required.");
      return;
    }

    const input = {
      event_id: Number(activeEvent.id),
      meal_type_id: Number(serviceTypeId),
      title: serviceTitle || undefined,
      starts_at: humanDateTimeToIso(serviceStart, activeEvent.starts_at),
      ends_at: humanDateTimeToIso(serviceEnd, activeEvent.starts_at),
    };

    void run(async () => {
      if (editingMealId) {
        await updateEventMeal(editingMealId, {
          ...input,
          title: serviceTitle || null,
        });
      } else {
        await createEventMeal(input);
      }
      setShowServiceForm(false);
      setEditingMealId(null);
    }, editingMealId ? "Food service updated." : "Food service added.");
  }

  function applyMenu(menuId: string) {
    if (!activeEventId) return;
    void run(async () => {
      await applyMealMenuToEvent(menuId, activeEventId);
      setShowMenuPicker(false);
    }, "Event menu changed.");
  }

  function loadPreset(key: string) {
    if (!activeEventId) return;
    void run(async () => {
      const result = await seedMealMenuPreset(key);
      await applyMealMenuToEvent(result.menu_id, activeEventId);
      setShowMenuPicker(false);
    }, "Menu loaded and applied.");
  }

  const todayKey = dayKey(new Date());
  const selectedDayDate = days.find((day) => day.key === selectedDay)?.date ?? null;

  return (
    <Box
      as="section"
      minW="0"
      minH={{
        base: composerOpen ? "72vh" : undefined,
        md: undefined,
      }}
    >
      <Box
        display="flex"
        flexDirection={{
          base: "column",
          lg: "row",
        }}
        alignItems={{
          base: "flex-start",
          lg: "flex-end",
        }}
        justifyContent="space-between"
        gap="18px"
        mb="4"
      >
        <Box>
          <Text
            fontSize="xs"
            fontWeight="800"
            letterSpacing="0.08em"
            color="gray.500"
          >
            ADMIN
          </Text>

          <Text
            as="h1"
            fontSize="2xl"
            fontWeight="700"
          >
            Meal planning
          </Text>

          <Text color="gray.600">
            Plan each food service, then use the same food library for meals, receptions, and after-hours.
          </Text>
        </Box>

        <Grid
          templateColumns={{
            base: "auto minmax(0, 1fr) auto",
          }}
          alignItems="center"
          gap="2"
          minH="40px"
          w={{
            base: "full",
            lg: "auto",
          }}
        >
          <Text
            fontSize="10px"
            fontWeight="800"
            textTransform="uppercase"
            letterSpacing="0.08em"
            color="#6d7169"
          >
            Menu
          </Text>

          <Text
            fontWeight="700"
            minW="0"
          >
            {currentMenu?.name ?? "No menu"}
          </Text>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setShowMenuPicker(
                (open) => !open,
              )
            }
          >
            Change
          </Button>
        </Grid>
      </Box>

      {showMenuPicker && (
        <Grid
          as="section"
          templateColumns={{
            base: "1fr",
            lg: "minmax(180px, .7fr) minmax(0, 1.3fr)",
          }}
          gap="18px"
          p="14px"
          mb="12px"
          borderWidth="1px"
          borderColor="#dddcd5"
          borderRadius="12px"
          bg="#ffffff"
        >
          <Stack
            gap="1"
            alignContent="start"
          >
            <Text fontWeight="700">
              Saved menus
            </Text>

            <Text
              fontSize="12px"
              color="#6d7169"
            >
              Use one menu as the event baseline. Individual services can still be customized.
            </Text>
          </Stack>

          <Grid
            templateColumns="repeat(auto-fit, minmax(180px, 1fr))"
            gap="2"
          >
            {menus.map((menu) => {
              const active =
                menu.id === currentMenu?.id;

              return (
                <Button
                  key={menu.id}
                  type="button"
                  variant="outline"
                  minH="54px"
                  h="auto"
                  justifyContent="flex-start"
                  textAlign="left"
                  px="11px"
                  py="9px"
                  borderColor={
                    active
                      ? "#9ccfbd"
                      : "#dddcd5"
                  }
                  bg={
                    active
                      ? "#e7f3ef"
                      : "#ffffff"
                  }
                  onClick={() =>
                    applyMenu(menu.id)
                  }
                >
                  <Stack gap="3px">
                    <Text fontWeight="700">
                      {menu.name}
                    </Text>

                    <Text
                      fontSize="11px"
                      color="#6d7169"
                    >
                      {menu.item_count} placements
                    </Text>
                  </Stack>
                </Button>
              );
            })}

            {presets.map((preset) => (
              <Button
                key={preset.key}
                type="button"
                variant="outline"
                minH="54px"
                h="auto"
                justifyContent="flex-start"
                textAlign="left"
                px="11px"
                py="9px"
                borderColor="#dddcd5"
                bg="#ffffff"
                onClick={() =>
                  loadPreset(preset.key)
                }
              >
                <Stack gap="3px">
                  <Text fontWeight="700">
                    Load {preset.name}
                  </Text>

                  <Text
                    fontSize="11px"
                    color="#6d7169"
                  >
                    {preset.item_count} items
                  </Text>
                </Stack>
              </Button>
            ))}
          </Grid>
        </Grid>
      )}

      {error && (
        <Alert.Root
          status="error"
          mb="3"
        >
          <Alert.Indicator />

          <Alert.Content>
            <Alert.Description>
              {error}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {status && (
        <Alert.Root
          status="success"
          mb="3"
        >
          <Alert.Indicator />

          <Alert.Content>
            <Alert.Description>
              {status}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {!composerOpen && (
        <>
          <Box
            position="sticky"
            top="0"
            zIndex="8"
            display="flex"
            alignItems={{
              base: "stretch",
              md: "center",
            }}
            justifyContent="space-between"
            gap="3"
            py="2"
            pb="10px"
            bg="#f6f5f1"
          >
            <HStack
              minW="0"
              gap="1"
              overflowX="auto"
              scrollbarWidth="none"
              aria-label="Event day"
            >
              {days.map((day) => {
                const active =
                  selectedDay === day.key;

                return (
                  <Button
                    key={day.key}
                    type="button"
                    variant="outline"
                    flex="0 0 auto"
                    minW={{
                      base: "62px",
                      md: "72px",
                    }}
                    minH="48px"
                    h="auto"
                    px="10px"
                    py="6px"
                    borderColor={
                      active
                        ? "#9ccfbd"
                        : "#dddcd5"
                    }
                    bg={
                      active
                        ? "#e7f3ef"
                        : "#ffffff"
                    }
                    color={
                      active
                        ? "#005d41"
                        : "#6d7169"
                    }
                    onClick={() =>
                      setSelectedDay(day.key)
                    }
                  >
                    <Stack
                      gap="1px"
                      textAlign="center"
                    >
                      <Text
                        fontSize="10px"
                        fontWeight="750"
                        textTransform="uppercase"
                        letterSpacing="0.05em"
                      >
                        {day.date.toLocaleDateString(
                          [],
                          {
                            weekday: "short",
                          },
                        )}
                      </Text>

                      <Text
                        fontSize="15px"
                        fontWeight="700"
                        color="#171915"
                      >
                        {day.date.getDate()}
                      </Text>

                      {day.key === todayKey && (
                        <Text
                          fontSize="9px"
                          fontWeight="750"
                          color="#005d41"
                        >
                          Today
                        </Text>
                      )}
                    </Stack>
                  </Button>
                );
              })}
            </HStack>

            <Button
              type="button"
              colorPalette="green"
              flex="0 0 auto"
              onClick={openNewService}
            >
              + Food service
            </Button>
          </Box>

          {showServiceForm && (
            <Grid
              as="form"
              onSubmit={submitService}
              templateColumns={{
                base: "1fr",
                lg: "minmax(130px, .65fr) minmax(180px, 1fr) minmax(210px, 1fr) minmax(210px, 1fr) auto",
              }}
              gap="2"
              alignItems="end"
              p="3"
              mb="3"
              borderWidth="1px"
              borderColor="#dddcd5"
              borderRadius="12px"
              bg="#ffffff"
            >
              <Field.Root>
                <Field.Label>
                  Service type
                </Field.Label>

                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={serviceTypeId}
                    onChange={(event) =>
                      setServiceTypeId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Service type
                    </option>

                    {mealTypes.map((type) => (
                      <option
                        key={type.id}
                        value={type.id}
                      >
                        {type.name}
                      </option>
                    ))}
                  </NativeSelect.Field>

                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>

              <Field.Root>
                <Field.Label>
                  Title
                </Field.Label>

                <Input
                  placeholder="Special title (optional)"
                  value={serviceTitle}
                  onChange={(event) =>
                    setServiceTitle(
                      event.target.value,
                    )
                  }
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>
                  Starts
                </Field.Label>

                <HumanDateTimeInput
                  value={serviceStart}
                  onChange={setServiceStart}
                  placeholder="Starts"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>
                  Ends
                </Field.Label>

                <HumanDateTimeInput
                  value={serviceEnd}
                  onChange={setServiceEnd}
                  placeholder="Ends"
                />
              </Field.Root>

              <HStack gap="2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setShowServiceForm(false)
                  }
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  colorPalette="green"
                >
                  {editingMealId
                    ? "Save service"
                    : "Add service"}
                </Button>
              </HStack>
            </Grid>
          )}

          <Box
            as="section"
            overflow="hidden"
            borderWidth="1px"
            borderColor="#dddcd5"
            borderRadius="12px"
            bg="#ffffff"
          >
            <Box
              minH="54px"
              px="14px"
              py="10px"
              borderBottomWidth="1px"
              borderColor="#dddcd5"
            >
              <Text fontWeight="700">
                {selectedDayDate
                  ? dayLabel(selectedDayDate)
                  : "Event day"}
              </Text>

              <Text
                mt="2px"
                fontSize="11px"
                color="#6d7169"
              >
                Choose a service to plan its food.
              </Text>
            </Box>

            <Stack gap="0">
              {visibleMeals.map((meal) => (
                <Grid
                  as="article"
                  key={meal.id}
                  templateColumns={{
                    base: "62px minmax(0, 1fr)",
                    md: "84px minmax(0, 1fr) auto",
                  }}
                  gap={{
                    base: "9px",
                    md: "14px",
                  }}
                  alignItems="center"
                  minH="72px"
                  px="14px"
                  py="10px"
                  borderBottomWidth="1px"
                  borderColor="#dddcd5"
                >
                  <Text
                    as="time"
                    fontSize="11px"
                    fontWeight="800"
                    color="#6d7169"
                    whiteSpace="nowrap"
                  >
                    {serviceTime(
                      meal.starts_at,
                    )}
                  </Text>

                  <Box minW="0">
                    <HStack
                      alignItems="baseline"
                      gap="2"
                      flexWrap="wrap"
                    >
                      <Text
                        fontSize="13px"
                        fontWeight="700"
                      >
                        {meal.title ??
                          meal.meal_type_name}
                      </Text>

                      {meal.title &&
                        meal.title !==
                          meal.meal_type_name && (
                          <Text
                            fontSize="10px"
                            color="#6d7169"
                          >
                            {
                              meal.meal_type_name
                            }
                          </Text>
                        )}
                    </HStack>

                    <Text
                      mt="1"
                      fontSize="11px"
                      lineHeight="1.45"
                      color={
                        meal.items.length
                          ? "#6d7169"
                          : "#005d41"
                      }
                    >
                      {meal.items.length
                        ? meal.items
                            .map(
                              (item) =>
                                item.name,
                            )
                            .join(" · ")
                        : "No food planned yet."}
                    </Text>
                  </Box>

                  <HStack
                    gap="2"
                    gridColumn={{
                      base: "2",
                      md: "auto",
                    }}
                  >
                    <Button
                      type="button"
                      size="sm"
                      colorPalette="green"
                      onClick={() =>
                        openComposer({
                          kind: "meal",
                          mealId: meal.id,
                        })
                      }
                    >
                      Plan food
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        editService(meal)
                      }
                    >
                      Edit time
                    </Button>
                  </HStack>
                </Grid>
              ))}

              {!visibleMeals.length && (
                <Box
                  p="8"
                  textAlign="center"
                >
                  <Text color="#6d7169">
                    No food services scheduled for this day.
                  </Text>
                </Box>
              )}
            </Stack>
          </Box>

          <Box
            as="section"
            mt="3"
            overflow="hidden"
            borderWidth="1px"
            borderColor="#dddcd5"
            borderRadius="12px"
            bg="#ffffff"
          >
            <Box
              minH="54px"
              px="14px"
              py="10px"
              borderBottomWidth="1px"
              borderColor="#dddcd5"
            >
              <Text fontWeight="700">
                Anytime offerings
              </Text>

              <Text
                mt="2px"
                fontSize="11px"
                color="#6d7169"
              >
                Food members can choose outside scheduled meal services.
              </Text>
            </Box>

            {([
              [
                "SNACK",
                "Snacks",
                "Pickup throughout the day",
              ],
              [
                "AFTER_HOURS",
                "After-hours",
                "Pickup or delivery after hours",
              ],
            ] as const).map(
              ([
                offeringType,
                title,
                description,
              ]) => {
                const offeringItems =
                  offerings.filter(
                    (item) =>
                      item.offering_type ===
                      offeringType,
                  );

                const availableItems =
                  offeringItems.filter(
                    (item) => item.available,
                  );

                return (
                  <Grid
                    as="article"
                    key={offeringType}
                    templateColumns={{
                      base: "1fr",
                      md: "84px minmax(0, 1fr) auto",
                    }}
                    gap="14px"
                    alignItems="center"
                    minH="72px"
                    px="14px"
                    py="10px"
                    borderBottomWidth="1px"
                    borderColor="#dddcd5"
                  >
                    <Text
                      fontSize="11px"
                      fontWeight="800"
                      color="#6d7169"
                      whiteSpace="nowrap"
                    >
                      Anytime
                    </Text>

                    <Box minW="0">
                      <HStack
                        alignItems="baseline"
                        gap="2"
                        flexWrap="wrap"
                      >
                        <Text
                          fontSize="13px"
                          fontWeight="700"
                        >
                          {title}
                        </Text>

                        <Text
                          fontSize="10px"
                          color="#6d7169"
                        >
                          {description}
                        </Text>
                      </HStack>

                      <Text
                        mt="1"
                        fontSize="11px"
                        lineHeight="1.45"
                        color={
                          offeringItems.length
                            ? "#6d7169"
                            : "#005d41"
                        }
                      >
                        {offeringItems.length
                          ? availableItems
                              .map(
                                (item) =>
                                  item.name,
                              )
                              .join(" · ") ||
                            `All ${title.toLowerCase()} foods are hidden.`
                          : `No ${title.toLowerCase()} food planned yet.`}
                      </Text>
                    </Box>

                    <Button
                      type="button"
                      size="sm"
                      colorPalette="green"
                      onClick={() =>
                        openComposer({
                          kind: "offering",
                          offeringType,
                        })
                      }
                    >
                      Plan food
                    </Button>
                  </Grid>
                );
              },
            )}
          </Box>
        </>
      )}

      {composerOpen && selectedTarget && (
        <Box
          as="section"
          position={{
            base: "fixed",
            md: "static",
          }}
          inset={{
            base: "64px 0 0",
            md: "auto",
          }}
          zIndex={{
            base: "70",
            md: "auto",
          }}
          h={{
            base: "calc(100dvh - 64px)",
            md: "auto",
          }}
          overflow={{
            base: "auto",
            md: "hidden",
          }}
          borderWidth={{
            base: "0",
            md: "1px",
          }}
          borderColor="#dddcd5"
          borderRadius={{
            base: "0",
            md: "12px",
          }}
          bg="#ffffff"
        >
          <Grid
            as="header"
            position="sticky"
            top="0"
            zIndex="9"
            templateColumns={{
              base: "auto minmax(0, 1fr)",
              md: "auto minmax(0, 1fr) auto",
            }}
            gap="3"
            alignItems="center"
            minH="66px"
            px="3"
            py="10px"
            borderBottomWidth="1px"
            borderColor="#dddcd5"
            bg="#ffffff"
          >
            <Button
              type="button"
              variant="outline"
              onClick={closeComposer}
            >
              ← Back to day
            </Button>

            <Stack
              minW="0"
              gap="2px"
            >
              <Text
                fontSize="10px"
                fontWeight="800"
                textTransform="uppercase"
                letterSpacing="0.08em"
                color="#6d7169"
              >
                PLANNING FOOD FOR
              </Text>

              <Text
                fontSize="15px"
                fontWeight="700"
              >
                {selectedTargetTitle}
              </Text>

              <Text
                fontSize="11px"
                color="#6d7169"
              >
                {selectedTargetMeta}
              </Text>
            </Stack>

            {selectedTarget.kind ===
              "meal" &&
              selectedMeal && (
                <Button
                  type="button"
                  variant="outline"
                  gridColumn={{
                    base: "2",
                    md: "auto",
                  }}
                  justifySelf={{
                    base: "start",
                    md: "auto",
                  }}
                  onClick={() =>
                    editService(selectedMeal)
                  }
                >
                  Edit time
                </Button>
              )}
          </Grid>

          <Grid
            templateColumns={{
              base: "1fr",
              md: "minmax(300px, .78fr) minmax(360px, 1.22fr)",
            }}
            minH={{
              base: "calc(100dvh - 130px)",
              md: "min(680px, calc(100vh - 220px))",
            }}
            pb={{
              base:
                "calc(74px + env(safe-area-inset-bottom))",
              md: "0",
            }}
          >
            <Box
              as="section"
              minW="0"
              borderRightWidth={{
                base: "0",
                md: "1px",
              }}
              borderBottomWidth={{
                base: "0",
                md: "0",
              }}
              borderColor="#dddcd5"
              bg="#ffffff"
            >
              <Box
                minH="66px"
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                gap="3"
                px="14px"
                py="12px"
                borderBottomWidth="1px"
                borderColor="#dddcd5"
              >
                <Stack
                  minW="0"
                  gap="3px"
                >
                  <Text
                    fontSize="13px"
                    fontWeight="700"
                  >
                    Food library
                  </Text>

                  <Text
                    fontSize="10px"
                    lineHeight="1.35"
                    color="#6d7169"
                  >
                    Tap to add. Drag to place on desktop.
                  </Text>
                </Stack>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingFoodId(null);
                    setFoodName("");
                    setFoodDescription("");
                    setFoodDietary("");
                    setFoodTags([]);
                    setShowFoodForm(
                      (open) => !open,
                    );
                  }}
                >
                  + New food
                </Button>
              </Box>

              {showFoodForm && (
                <Grid
                  as="form"
                  onSubmit={submitFood}
                  templateColumns={{
                    base: "1fr",
                    md: "minmax(140px, 1fr) minmax(140px, 1fr)",
                  }}
                  gap="6px"
                  px="10px"
                  py="8px"
                  borderBottomWidth="1px"
                  borderColor="#dddcd5"
                  bg="#fbfaf7"
                >
                  <Input
                    autoFocus
                    placeholder="Food name"
                    value={foodName}
                    onChange={(event) =>
                      setFoodName(
                        event.target.value,
                      )
                    }
                    required
                  />

                  <Input
                    placeholder="Description (optional)"
                    value={foodDescription}
                    onChange={(event) =>
                      setFoodDescription(
                        event.target.value,
                      )
                    }
                  />

                  <Input
                    placeholder="Dietary note (optional)"
                    value={foodDietary}
                    onChange={(event) =>
                      setFoodDietary(
                        event.target.value,
                      )
                    }
                  />

                  <Box
                    as="fieldset"
                    gridColumn={{
                      md: "1 / -1",
                    }}
                    pt="2px"
                  >
                    <Text
                      as="legend"
                      fontSize="sm"
                      fontWeight="700"
                      mb="2"
                    >
                      Food tags
                    </Text>

                    <HStack
                      flexWrap="wrap"
                      gap="5px"
                    >
                      {foodTagValues.map(
                        (tag) => {
                          const selected =
                            foodTags.includes(
                              tag,
                            );

                          return (
                            <Button
                              key={tag}
                              type="button"
                              size="xs"
                              variant="outline"
                              minH="28px"
                              px="9px"
                              borderRadius="full"
                              borderColor={
                                selected
                                  ? "#9ccfbd"
                                  : "#dddcd5"
                              }
                              bg={
                                selected
                                  ? "#e7f3ef"
                                  : "#ffffff"
                              }
                              color={
                                selected
                                  ? "#005d41"
                                  : "#6d7169"
                              }
                              aria-pressed={
                                selected
                              }
                              onClick={() =>
                                setFoodTags(
                                  (
                                    current,
                                  ) =>
                                    current.includes(
                                      tag,
                                    )
                                      ? current.filter(
                                          (
                                            item,
                                          ) =>
                                            item !==
                                            tag,
                                        )
                                      : [
                                          ...current,
                                          tag,
                                        ],
                                )
                              }
                            >
                              {foodTagLabel(
                                tag,
                              )}
                            </Button>
                          );
                        },
                      )}
                    </HStack>
                  </Box>

                  <HStack
                    gridColumn={{
                      md: "1 / -1",
                    }}
                    gap="2"
                  >
                    <Button
                      type="submit"
                      colorPalette="green"
                    >
                      {editingFoodId
                        ? "Save"
                        : "Add"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setShowFoodForm(false)
                      }
                    >
                      Cancel
                    </Button>
                  </HStack>
                </Grid>
              )}

              <Grid
                templateColumns="minmax(0, 1fr) auto"
                alignItems="center"
                gap="10px"
                px="12px"
                pt="10px"
                pb="8px"
              >
                <Input
                  type="search"
                  placeholder="Search foods…"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  minH="34px"
                />

                <Text
                  fontSize="10px"
                  color="#6d7169"
                  whiteSpace="nowrap"
                >
                  {visibleLibrary.length} foods
                </Text>
              </Grid>

              <HStack
                gap="5px"
                px="12px"
                pb="9px"
                overflowX="auto"
                scrollbarWidth="none"
              >
                {[
                  ["all", "All"],
                  [
                    "breakfast",
                    "Breakfast",
                  ],
                  ["lunch", "Lunch"],
                  ["dinner", "Dinner"],
                  ["unused", "Unused"],
                ].map(([value, label]) => {
                  const active =
                    filter === value;

                  return (
                    <Button
                      key={value}
                      type="button"
                      size="xs"
                      variant="outline"
                      flex="0 0 auto"
                      minH="28px"
                      px="9px"
                      borderRadius="full"
                      borderColor={
                        active
                          ? "#9ccfbd"
                          : "#dddcd5"
                      }
                      bg={
                        active
                          ? "#e7f3ef"
                          : "#ffffff"
                      }
                      color={
                        active
                          ? "#005d41"
                          : "#6d7169"
                      }
                      onClick={() =>
                        setFilter(
                          value as typeof filter,
                        )
                      }
                    >
                      {label}
                    </Button>
                  );
                })}
              </HStack>

              <HStack
                gap="5px"
                px="12px"
                pt="1px"
                pb="9px"
                overflowX="auto"
                scrollbarWidth="none"
                borderTopWidth="1px"
                borderColor="#dddcd5"
                aria-label="Filter by food tag"
              >
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  flex="0 0 auto"
                  minH="28px"
                  px="9px"
                  borderRadius="full"
                  borderColor={
                    tagFilter === "ALL"
                      ? "#9ccfbd"
                      : "#dddcd5"
                  }
                  bg={
                    tagFilter === "ALL"
                      ? "#e7f3ef"
                      : "#ffffff"
                  }
                  color={
                    tagFilter === "ALL"
                      ? "#005d41"
                      : "#6d7169"
                  }
                  onClick={() =>
                    setTagFilter("ALL")
                  }
                >
                  All tags
                </Button>

                {foodTagValues.map(
                  (tag) => {
                    const active =
                      tagFilter === tag;

                    return (
                      <Button
                        key={tag}
                        type="button"
                        size="xs"
                        variant="outline"
                        flex="0 0 auto"
                        minH="28px"
                        px="9px"
                        borderRadius="full"
                        borderColor={
                          active
                            ? "#9ccfbd"
                            : "#dddcd5"
                        }
                        bg={
                          active
                            ? "#e7f3ef"
                            : "#ffffff"
                        }
                        color={
                          active
                            ? "#005d41"
                            : "#6d7169"
                        }
                        onClick={() =>
                          setTagFilter(tag)
                        }
                      >
                        {foodTagLabel(
                          tag,
                        )}
                      </Button>
                    );
                  },
                )}
              </HStack>

              <Stack
                gap="0"
                minH="0"
                maxH={{
                  base: "none",
                  md: "calc(100vh - 365px)",
                }}
                overflowY="auto"
                borderTopWidth="1px"
                borderColor="#dddcd5"
              >
                {visibleLibrary.map(
                  (item) => (
                    <Grid
                      as="article"
                      key={item.id}
                      draggable
                      templateColumns="18px minmax(0, 1fr) auto"
                      alignItems="center"
                      gap="2"
                      minH="44px"
                      px="10px"
                      py="6px"
                      borderBottomWidth="1px"
                      borderColor="#dddcd5"
                      bg="#ffffff"
                      cursor="grab"
                      userSelect="none"
                      _hover={{
                        bg: "#fbfaf7",
                      }}
                      onDragStart={(
                        event,
                      ) =>
                        writeDrag(
                          event,
                          {
                            kind: "library",
                            itemId:
                              item.id,
                          },
                        )
                      }
                      onClick={() =>
                        addFood(item.id)
                      }
                    >
                      <Text
                        aria-hidden="true"
                        color="#c8c7bf"
                        fontSize="13px"
                        fontWeight="800"
                        letterSpacing="-0.16em"
                      >
                        ⋮⋮
                      </Text>

                      <Stack
                        minW="0"
                        gap="2px"
                      >
                        <Text
                          overflow="hidden"
                          fontSize="11px"
                          fontWeight="700"
                          lineHeight="1.25"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                        >
                          {item.name}
                        </Text>

                        {(item.description ||
                          item.dietary_notes) && (
                          <Text
                            overflow="hidden"
                            fontSize="9px"
                            lineHeight="1.25"
                            color="#6d7169"
                            textOverflow="ellipsis"
                            whiteSpace="nowrap"
                          >
                            {[
                              item.description,
                              item.dietary_notes,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </Text>
                        )}

                        {item.tags.length >
                          0 && (
                          <HStack
                            flexWrap="wrap"
                            gap="3px"
                            mt="2px"
                          >
                            {item.tags.map(
                              (tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  borderRadius="full"
                                  bg="#fbfaf7"
                                  color="#6d7169"
                                  fontSize="8px"
                                  fontWeight="750"
                                >
                                  {foodTagLabel(
                                    tag,
                                  )}
                                </Badge>
                              ),
                            )}
                          </HStack>
                        )}
                      </Stack>

                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        color="#6d7169"
                        onClick={(
                          event,
                        ) => {
                          event.stopPropagation();
                          editFood(item);
                        }}
                      >
                        Edit
                      </Button>
                    </Grid>
                  ),
                )}
              </Stack>
            </Box>

            <Box
              as="section"
              position={{
                base: "fixed",
                md: "static",
              }}
              left={{
                base: "0",
                md: "auto",
              }}
              right={{
                base: "0",
                md: "auto",
              }}
              bottom={{
                base: "0",
                md: "auto",
              }}
              zIndex={{
                base: "72",
                md: "auto",
              }}
              w="full"
              h={{
                base: "min(62dvh, 560px)",
                md: "auto",
              }}
              maxH={{
                base: "calc(100dvh - 76px)",
                md: "none",
              }}
              display="grid"
              gridTemplateRows="auto auto minmax(0, 1fr) auto"
              overflow="hidden"
              borderWidth={{
                base: "1px",
                md: "0",
              }}
              borderBottomWidth={{
                base: "0",
                md: "0",
              }}
              borderColor="#c8c7bf"
              borderRadius={{
                base: "16px 16px 0 0",
                md: "0",
              }}
              bg="#fbfaf7"
              boxShadow={{
                base:
                  "0 -12px 28px rgba(23, 25, 21, 0.12)",
                md: "none",
              }}
              transform={{
                base: mobileSheetOpen
                  ? "translateY(0)"
                  : "translateY(calc(100% - 62px - env(safe-area-inset-bottom)))",
                md: "none",
              }}
              transition={{
                base: "transform 180ms ease",
                md: "none",
              }}
              outline={
                dragOverComposer
                  ? "2px solid #007854"
                  : "none"
              }
              outlineOffset="-2px"
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverComposer(true);
              }}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as
                      | Node
                      | null,
                  )
                ) {
                  setDragOverComposer(false);
                }
              }}
              onDrop={(event) =>
                dropIntoComposer(event)
              }
            >
              <Button
                type="button"
                display={{
                  base: "grid",
                  md: "none",
                }}
                position="relative"
                gridTemplateColumns="minmax(0, 1fr) auto"
                alignItems="center"
                gap="3"
                minH="62px"
                h="auto"
                px="4"
                pt="13px"
                pb="8px"
                border="0"
                borderBottomWidth="1px"
                borderColor="#dddcd5"
                borderRadius="0"
                bg="#ffffff"
                color="#171915"
                textAlign="left"
                aria-expanded={
                  mobileSheetOpen
                }
                _before={{
                  content: '""',
                  w: "34px",
                  h: "3px",
                  position: "absolute",
                  top: "6px",
                  left: "50%",
                  borderRadius: "full",
                  bg: "#c8c7bf",
                  transform:
                    "translateX(-50%)",
                }}
                onClick={() =>
                  setMobileSheetOpen(
                    (open) => !open,
                  )
                }
              >
                <Stack
                  minW="0"
                  gap="2px"
                >
                  <Text
                    overflow="hidden"
                    fontWeight="700"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {selectedTargetTitle}
                  </Text>

                  <Text
                    overflow="hidden"
                    fontSize="10px"
                    fontWeight="650"
                    color="#6d7169"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {selectedTargetItems.length}{" "}
                    food
                    {selectedTargetItems.length ===
                    1
                      ? ""
                      : "s"}{" "}
                    selected
                  </Text>
                </Stack>

                <Text
                  fontSize="11px"
                  fontWeight="800"
                  color="#005d41"
                >
                  {mobileSheetOpen
                    ? "Done"
                    : "Review"}
                </Text>
              </Button>

              <Box
                minH={{
                  base: "44px",
                  md: "56px",
                }}
                display={
                  selectedTarget.kind ===
                    "meal" &&
                  selectedMeal?.composition_mode ===
                    "CUSTOM" &&
                  currentMenu
                    ? "flex"
                    : {
                        base: "none",
                        md: "flex",
                      }
                }
                alignItems="center"
                justifyContent="space-between"
                gap="10px"
                px="14px"
                py={{
                  base: "6px",
                  md: "10px",
                }}
                borderBottomWidth="1px"
                borderColor="#dddcd5"
                bg="#ffffff"
              >
                <Stack
                  display={{
                    base:
                      selectedTarget.kind ===
                        "meal" &&
                      selectedMeal?.composition_mode ===
                        "CUSTOM" &&
                      currentMenu
                        ? "none"
                        : "flex",
                    md: "flex",
                  }}
                  gap="2px"
                >
                  <Text fontWeight="700">
                    {selectedTargetTitle}
                  </Text>

                  <Text
                    fontSize="11px"
                    color="#6d7169"
                  >
                    {selectedTargetItems.length}{" "}
                    food
                    {selectedTargetItems.length ===
                    1
                      ? ""
                      : "s"}
                  </Text>
                </Stack>

                {selectedTarget.kind ===
                  "meal" &&
                  selectedMeal?.composition_mode ===
                    "CUSTOM" &&
                  currentMenu && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      ml={{
                        base: "auto",
                        md: "0",
                      }}
                      onClick={() =>
                        void run(
                          () =>
                            resetEventMealItems(
                              selectedMeal.id,
                            ),
                          "Service reset to the event menu.",
                        )
                      }
                    >
                      Reset to menu
                    </Button>
                  )}
              </Box>

              <Stack
                gap="0"
                minH="0"
                overflow="auto"
              >
                {selectedTargetItems.length ? (
                  selectedTargetItems.map(
                    (item) => {
                      const assignmentId =
                        selectedTarget.kind ===
                        "offering"
                          ? (
                              item as FoodOffering
                            ).id
                          : undefined;

                      const itemId =
                        "item_id" in item
                          ? item.item_id
                          : "";

                      const available =
                        selectedTarget.kind ===
                        "offering"
                          ? (
                              item as FoodOffering
                            ).available
                          : true;

                      const dragOver =
                        dragOverItemId ===
                        itemId;

                      return (
                        <Grid
                          as="article"
                          key={`${selectedTarget.kind}:${assignmentId ?? itemId}`}
                          draggable
                          templateColumns={{
                            base: "18px minmax(0, 1fr) auto",
                            md: "18px minmax(0, 1fr) auto auto",
                          }}
                          alignItems="center"
                          gap="2"
                          minH="48px"
                          px="3"
                          py="2"
                          borderBottomWidth="1px"
                          borderColor="#dddcd5"
                          bg="#ffffff"
                          opacity={
                            available
                              ? "1"
                              : "0.55"
                          }
                          boxShadow={
                            dragOver
                              ? "inset 0 2px 0 #007854"
                              : "none"
                          }
                          onDragStart={(
                            event,
                          ) =>
                            writeDrag(
                              event,
                              {
                                kind: "target",
                                itemId,
                                assignmentId,
                              },
                            )
                          }
                          onDragOver={(
                            event,
                          ) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setDragOverItemId(
                              itemId,
                            );
                          }}
                          onDrop={(
                            event,
                          ) =>
                            dropIntoComposer(
                              event,
                              item,
                            )
                          }
                        >
                          <Text
                            aria-hidden="true"
                            color="#c8c7bf"
                            fontSize="13px"
                            fontWeight="800"
                            letterSpacing="-0.16em"
                          >
                            ⋮⋮
                          </Text>

                          <Stack
                            minW="0"
                            gap="2px"
                          >
                            <Text
                              fontSize="12px"
                              fontWeight="700"
                            >
                              {item.name}
                            </Text>

                            {item.description && (
                              <Text
                                fontSize="10px"
                                color="#6d7169"
                              >
                                {
                                  item.description
                                }
                              </Text>
                            )}
                          </Stack>

                          {selectedTarget.kind ===
                            "offering" && (
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              gridColumn={{
                                base: "2",
                                md: "auto",
                              }}
                              justifySelf={{
                                base: "start",
                                md: "auto",
                              }}
                              color="#6d7169"
                              onClick={() =>
                                void run(
                                  () =>
                                    updateFoodOffering(
                                      (
                                        item as FoodOffering
                                      ).id,
                                      {
                                        available:
                                          !(
                                            item as FoodOffering
                                          )
                                            .available,
                                      },
                                    ),
                                )
                              }
                            >
                              {
                                (
                                  item as FoodOffering
                                ).available
                                  ? "Available"
                                  : "Hidden"
                              }
                            </Button>
                          )}

                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            minW="28px"
                            px="0"
                            fontSize="16px"
                            color="#6d7169"
                            aria-label={`Remove ${item.name}`}
                            onClick={() =>
                              removeFood(
                                itemId,
                                assignmentId,
                              )
                            }
                          >
                            ×
                          </Button>
                        </Grid>
                      );
                    },
                  )
                ) : (
                  <Box
                    minH="220px"
                    display="grid"
                    placeContent="center"
                    gap="1"
                    p="6"
                    textAlign="center"
                  >
                    <Text fontWeight="700">
                      No food yet.
                    </Text>

                    <Text
                      fontSize="11px"
                      color="#6d7169"
                    >
                      Tap a food on the left or drag it here.
                    </Text>
                  </Box>
                )}
              </Stack>

              {selectedTarget.kind ===
                "meal" &&
                selectedMeal && (
                  <HStack
                    justifyContent="flex-end"
                    px="3"
                    pt="10px"
                    pb={{
                      base:
                        "calc(10px + env(safe-area-inset-bottom))",
                      md: "10px",
                    }}
                    borderTopWidth="1px"
                    borderColor="#dddcd5"
                    bg="#ffffff"
                  >
                    <Button
                      type="button"
                      colorPalette="red"
                      variant="outline"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete ${selectedMeal.title ?? selectedMeal.meal_type_name}?`,
                          )
                        ) {
                          void run(
                            async () => {
                              await deleteEventMeal(
                                selectedMeal.id,
                              );
                              closeComposer();
                            },
                            "Food service deleted.",
                          );
                        }
                      }}
                    >
                      Delete service
                    </Button>
                  </HStack>
                )}
            </Box>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
