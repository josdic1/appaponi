import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type FormEvent,
} from "react";

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
    <section className={`meal-planning-page${composerOpen ? " composer-open" : ""}`}>
      <div className="admin-heading meal-planning-heading">
        <div>
          <div className="admin-eyebrow">ADMIN</div>
          <h1>Meal planning</h1>
          <p>Plan each food service, then use the same food library for meals, receptions, and after-hours.</p>
        </div>

        <div className="meal-plan-menu-control">
          <span>Menu</span>
          <strong>{currentMenu?.name ?? "No menu"}</strong>
          <button className="app-button" type="button" onClick={() => setShowMenuPicker((open) => !open)}>
            Change
          </button>
        </div>
      </div>

      {showMenuPicker && (
        <section className="app-card meal-menu-picker-panel">
          <div>
            <strong>Saved menus</strong>
            <span>Use one menu as the event baseline. Individual services can still be customized.</span>
          </div>
          <div className="meal-menu-picker-list">
            {menus.map((menu) => (
              <button
                type="button"
                key={menu.id}
                className={menu.id === currentMenu?.id ? "active" : ""}
                onClick={() => applyMenu(menu.id)}
              >
                <strong>{menu.name}</strong>
                <span>{menu.item_count} placements</span>
              </button>
            ))}
            {presets.map((preset) => (
              <button type="button" key={preset.key} onClick={() => loadPreset(preset.key)}>
                <strong>Load {preset.name}</strong>
                <span>{preset.item_count} items</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {error && <div className="app-alert app-alert-danger">{error}</div>}
      {status && <div className="app-alert app-alert-success">{status}</div>}

      {!composerOpen && (
        <>
          <div className="meal-plan-daybar">
            <div className="app-day-rail" aria-label="Event day">
              {days.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  className={selectedDay === day.key ? "active" : ""}
                  onClick={() => setSelectedDay(day.key)}
                >
                  <span>{day.date.toLocaleDateString([], { weekday: "short" })}</span>
                  <strong>{day.date.getDate()}</strong>
                  {day.key === todayKey && <small>Today</small>}
                </button>
              ))}
            </div>

            <button className="app-button app-button-primary" type="button" onClick={openNewService}>
              + Food service
            </button>
          </div>

          {showServiceForm && (
            <form className="app-card meal-service-editor" onSubmit={submitService}>
              <select value={serviceTypeId} onChange={(event) => setServiceTypeId(event.target.value)} required>
                <option value="">Service type</option>
                {mealTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
              </select>
              <input
                placeholder="Special title (optional)"
                value={serviceTitle}
                onChange={(event) => setServiceTitle(event.target.value)}
              />
              <HumanDateTimeInput value={serviceStart} onChange={setServiceStart} placeholder="Starts" />
              <HumanDateTimeInput value={serviceEnd} onChange={setServiceEnd} placeholder="Ends" />
              <div className="meal-service-editor-actions">
                <button className="app-button" type="button" onClick={() => setShowServiceForm(false)}>Cancel</button>
                <button className="app-button app-button-primary" type="submit">{editingMealId ? "Save service" : "Add service"}</button>
              </div>
            </form>
          )}

          <section className="meal-day-plan">
            <header className="meal-day-plan-head">
              <div>
                <strong>{selectedDayDate ? dayLabel(selectedDayDate) : "Event day"}</strong>
                <span>Choose a service to plan its food.</span>
              </div>
            </header>

            <div className="meal-day-service-list">
              {visibleMeals.map((meal) => (
                <article className="meal-day-service-row" key={meal.id}>
                  <time>{serviceTime(meal.starts_at)}</time>
                  <div className="meal-day-service-copy">
                    <div className="meal-day-service-title">
                      <strong>{meal.title ?? meal.meal_type_name}</strong>
                      {meal.title && meal.title !== meal.meal_type_name && <span>{meal.meal_type_name}</span>}
                    </div>
                    <p className={meal.items.length ? "" : "empty"}>
                      {meal.items.length
                        ? meal.items.map((item) => item.name).join(" · ")
                        : "No food planned yet."}
                    </p>
                  </div>
                  <div className="meal-day-service-actions">
                    <button className="app-button app-button-primary" type="button" onClick={() => openComposer({ kind: "meal", mealId: meal.id })}>
                      Plan food
                    </button>
                    <button className="app-button" type="button" onClick={() => editService(meal)}>
                      Edit time
                    </button>
                  </div>
                </article>
              ))}

              {!visibleMeals.length && (
                <div className="app-empty">No food services scheduled for this day.</div>
              )}
            </div>
          </section>

          <section className="meal-anytime-plan">
            <header className="meal-day-plan-head">
              <div>
                <strong>Anytime offerings</strong>
                <span>Food members can choose outside scheduled meal services.</span>
              </div>
            </header>

            {([
              ["SNACK", "Snacks", "Pickup throughout the day"],
              ["AFTER_HOURS", "After-hours", "Pickup or delivery after hours"],
            ] as const).map(([offeringType, title, description]) => {
              const offeringItems = offerings.filter((item) => item.offering_type === offeringType);
              const availableItems = offeringItems.filter((item) => item.available);
              return (
                <article className="meal-day-service-row meal-offering-service-row" key={offeringType}>
                  <span className="meal-offering-time">Anytime</span>
                  <div className="meal-day-service-copy">
                    <div className="meal-day-service-title">
                      <strong>{title}</strong>
                      <span>{description}</span>
                    </div>
                    <p className={offeringItems.length ? "" : "empty"}>
                      {offeringItems.length
                        ? availableItems.map((item) => item.name).join(" · ") || `All ${title.toLowerCase()} foods are hidden.`
                        : `No ${title.toLowerCase()} food planned yet.`}
                    </p>
                  </div>
                  <div className="meal-day-service-actions">
                    <button className="app-button app-button-primary" type="button" onClick={() => openComposer({ kind: "offering", offeringType })}>
                      Plan food
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}

      {composerOpen && selectedTarget && (
        <section className="food-composer-focus">
          <header className="food-composer-focus-head">
            <button className="app-button" type="button" onClick={closeComposer}>
              ← Back to day
            </button>
            <div>
              <span>PLANNING FOOD FOR</span>
              <strong>{selectedTargetTitle}</strong>
              <small>{selectedTargetMeta}</small>
            </div>
            {selectedTarget.kind === "meal" && selectedMeal && (
              <button className="app-button" type="button" onClick={() => editService(selectedMeal)}>
                Edit time
              </button>
            )}
          </header>

          <div className="food-composer-grid">
            <section className="food-composer-library">
              <div className="food-library-head">
                <div>
                  <strong>Food library</strong>
                  <span>Tap to add. Drag to place on desktop.</span>
                </div>
                <button
                  className="app-button"
                  type="button"
                  onClick={() => {
                    setEditingFoodId(null);
                    setFoodName("");
                    setFoodDescription("");
                    setFoodDietary("");
                    setFoodTags([]);
                    setShowFoodForm((open) => !open);
                  }}
                >
                  + New food
                </button>
              </div>

              {showFoodForm && (
                <form className="meal-plan-food-editor" onSubmit={submitFood}>
                  <input autoFocus placeholder="Food name" value={foodName} onChange={(event) => setFoodName(event.target.value)} required />
                  <input placeholder="Description (optional)" value={foodDescription} onChange={(event) => setFoodDescription(event.target.value)} />
                  <input placeholder="Dietary note (optional)" value={foodDietary} onChange={(event) => setFoodDietary(event.target.value)} />

                  <fieldset className="app-choice-field food-tag-field">
                    <legend>Food tags</legend>

                    <div className="food-tag-picker">
                      {foodTagValues.map((tag) => {
                        const selected = foodTags.includes(tag);

                        return (
                          <button
                            key={tag}
                            type="button"
                            className={`app-button food-tag-choice${selected ? " selected" : ""}`}
                            aria-pressed={selected}
                            onClick={() =>
                              setFoodTags((current) =>
                                current.includes(tag)
                                  ? current.filter((item) => item !== tag)
                                  : [...current, tag],
                              )
                            }
                          >
                            {foodTagLabel(tag)}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <button className="app-button app-button-primary" type="submit">{editingFoodId ? "Save" : "Add"}</button>
                  <button className="app-button" type="button" onClick={() => setShowFoodForm(false)}>Cancel</button>
                </form>
              )}

              <div className="food-library-search-row">
                <input type="search" placeholder="Search foods…" value={search} onChange={(event) => setSearch(event.target.value)} />
                <span>{visibleLibrary.length} foods</span>
              </div>

              <div className="food-library-filters">
                {[
                  ["all", "All"],
                  ["breakfast", "Breakfast"],
                  ["lunch", "Lunch"],
                  ["dinner", "Dinner"],
                  ["unused", "Unused"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={filter === value ? "active" : ""}
                    onClick={() => setFilter(value as typeof filter)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div
                className="food-library-filters food-library-tag-filters"
                aria-label="Filter by food tag"
              >
                <button
                  type="button"
                  className={tagFilter === "ALL" ? "active" : ""}
                  onClick={() => setTagFilter("ALL")}
                >
                  All tags
                </button>

                {foodTagValues.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={tagFilter === tag ? "active" : ""}
                    onClick={() => setTagFilter(tag)}
                  >
                    {foodTagLabel(tag)}
                  </button>
                ))}
              </div>

              <div className="food-library-list">
                {visibleLibrary.map((item) => (
                  <article
                    key={item.id}
                    className="food-library-row"
                    draggable
                    onDragStart={(event) => writeDrag(event, { kind: "library", itemId: item.id })}
                    onClick={() => addFood(item.id)}
                  >
                    <span className="food-drag-grip" aria-hidden="true">⋮⋮</span>
                    <div className="food-library-copy">
                      <strong>{item.name}</strong>
                      {(item.description || item.dietary_notes) && (
                        <span>{[item.description, item.dietary_notes].filter(Boolean).join(" · ")}</span>
                      )}

                      {item.tags.length > 0 && (
                        <div className="food-library-tags">
                          {item.tags.map((tag) => (
                            <span key={tag}>
                              {foodTagLabel(tag)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="food-library-edit"
                      onClick={(event) => {
                        event.stopPropagation();
                        editFood(item);
                      }}
                    >
                      Edit
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section
              className={`food-composer-target app-bottom-sheet${dragOverComposer ? " drag-over" : ""}${mobileSheetOpen ? " mobile-open" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverComposer(true);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDragOverComposer(false);
                }
              }}
              onDrop={(event) => dropIntoComposer(event)}
            >
              <button
                type="button"
                className="app-bottom-sheet-handle"
                aria-expanded={mobileSheetOpen}
                onClick={() => setMobileSheetOpen((open) => !open)}
              >
                <span className="app-bottom-sheet-copy">
                  <strong>{selectedTargetTitle}</strong>
                  <small>{selectedTargetItems.length} food{selectedTargetItems.length === 1 ? "" : "s"} selected</small>
                </span>
                <span className="app-bottom-sheet-action">{mobileSheetOpen ? "Done" : "Review"}</span>
              </button>

              <header
                className={`food-composer-target-head${selectedTarget.kind === "meal" && selectedMeal?.composition_mode === "CUSTOM" && currentMenu ? " has-actions" : ""}`}
              >
                <div>
                  <strong>{selectedTargetTitle}</strong>
                  <span>{selectedTargetItems.length} food{selectedTargetItems.length === 1 ? "" : "s"}</span>
                </div>
                {selectedTarget.kind === "meal" && selectedMeal?.composition_mode === "CUSTOM" && currentMenu && (
                  <button
                    type="button"
                    className="app-button"
                    onClick={() => void run(() => resetEventMealItems(selectedMeal.id), "Service reset to the event menu.")}
                  >
                    Reset to menu
                  </button>
                )}
              </header>

              <div className="food-composer-selected-list">
                {selectedTargetItems.length ? selectedTargetItems.map((item) => {
                  const assignmentId = selectedTarget.kind === "offering" ? (item as FoodOffering).id : undefined;
                  const itemId = "item_id" in item ? item.item_id : "";
                  const available = selectedTarget.kind === "offering" ? (item as FoodOffering).available : true;
                  return (
                    <article
                      className={`food-composer-selected-row${dragOverItemId === itemId ? " drag-over" : ""}${available ? "" : " muted"}`}
                      key={`${selectedTarget.kind}:${assignmentId ?? itemId}`}
                      draggable
                      onDragStart={(event) => writeDrag(event, { kind: "target", itemId, assignmentId })}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setDragOverItemId(itemId);
                      }}
                      onDrop={(event) => dropIntoComposer(event, item)}
                    >
                      <span className="food-drag-grip" aria-hidden="true">⋮⋮</span>
                      <div>
                        <strong>{item.name}</strong>
                        {item.description && <span>{item.description}</span>}
                      </div>
                      {selectedTarget.kind === "offering" && (
                        <button
                          type="button"
                          className="food-composer-availability"
                          onClick={() => void run(() => updateFoodOffering((item as FoodOffering).id, { available: !(item as FoodOffering).available }))}
                        >
                          {(item as FoodOffering).available ? "Available" : "Hidden"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="food-composer-remove"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => removeFood(itemId, assignmentId)}
                      >
                        ×
                      </button>
                    </article>
                  );
                }) : (
                  <div className="food-composer-empty">
                    <strong>No food yet.</strong>
                    <span>Tap a food on the left or drag it here.</span>
                  </div>
                )}
              </div>

              {selectedTarget.kind === "meal" && selectedMeal && (
                <footer className="food-composer-target-footer">
                  <button
                    type="button"
                    className="app-button app-button-danger"
                    onClick={() => {
                      if (window.confirm(`Delete ${selectedMeal.title ?? selectedMeal.meal_type_name}?`)) {
                        void run(async () => {
                          await deleteEventMeal(selectedMeal.id);
                          closeComposer();
                        }, "Food service deleted.");
                      }
                    }}
                  >
                    Delete service
                  </button>
                </footer>
              )}
            </section>
          </div>
        </section>
      )}
    </section>
  );
}
