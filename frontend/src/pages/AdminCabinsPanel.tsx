import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import type {
  Area,
} from "@appoponi/shared/schemas/areas";
import type {
  Cabin,
} from "@appoponi/shared/schemas/cabins";
import type {
  CampCabinSlotId,
} from "@appoponi/shared/schemas/campMap";
import type {
  EventRegistration,
} from "@appoponi/shared/schemas/registration";

import {
  assignRegistrationCabin,
  createCabin,
  deleteCabin,
  loadCabinAreas,
  loadCabins,
  loadRegistrations,
  updateCabin,
} from "../api/admin";

import CampMapBase, {
  CAMP_MAP_CABINS,
  CAMP_MAP_HEIGHT,
  CampCabinShape,
  CAMP_MAP_WIDTH,
  findCampCabinSlotById,
  type CampMapCabinFeature,
} from "./CampMapBase";

type Props = {
  activeEventId?: string;
  onChanged?: () => void;
};

export default function AdminCabinsPanel({
  activeEventId = "",
  onChanged,
}: Props) {
  const [cabins, setCabins] =
    useState<Cabin[]>([]);
  const [areas, setAreas] =
    useState<Area[]>([]);
  const [registrations, setRegistrations] =
    useState<EventRegistration[]>([]);
  const [name, setName] = useState("");
  const [areaId, setAreaId] = useState("");
  const [placingCabinId, setPlacingCabinId] =
    useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] =
    useState<CampCabinSlotId | null>(null);
  const [error, setError] =
    useState<string | null>(null);
  const [showManageCabins, setShowManageCabins] =
    useState(false);

  async function refresh() {
    const [
      nextCabins,
      nextAreas,
      nextRegistrations,
    ] = await Promise.all([
      loadCabins(),
      loadCabinAreas(),
      loadRegistrations(),
    ]);

    setCabins(nextCabins);
    setAreas(nextAreas);
    setRegistrations(nextRegistrations);
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load cabins",
      ),
    );
  }, []);

  async function run(
    action: () => Promise<unknown>,
  ) {
    setError(null);

    try {
      await action();
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Request failed",
      );
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Cabin name is required.");
      return;
    }

    void run(async () => {
      const created = await createCabin({
        name: name.trim(),
        area_id: areaId
          ? Number(areaId)
          : null,
        map_slot_id: null,
      });

      setName("");
      setAreaId("");
      setPlacingCabinId(created.id);
      setSelectedSlotId(null);
    });
  }

  const placingCabin = useMemo(
    () =>
      cabins.find(
        (cabin) =>
          cabin.id === placingCabinId,
      ) ?? null,
    [cabins, placingCabinId],
  );

  const cabinSlots = useMemo(() => {
    const result = new Map<
      string,
      CampMapCabinFeature
    >();

    for (const cabin of cabins) {
      const slot = findCampCabinSlotById(
        cabin.map_slot_id,
      );

      if (slot) {
        result.set(cabin.id, slot);
      }
    }

    return result;
  }, [cabins]);

  const slotOwners = useMemo(() => {
    const result = new Map<
      CampCabinSlotId,
      Cabin
    >();

    for (const cabin of cabins) {
      if (cabin.map_slot_id) {
        result.set(
          cabin.map_slot_id,
          cabin,
        );
      }
    }

    return result;
  }, [cabins]);

  const activeRegistrations = useMemo(
    () =>
      activeEventId
        ? registrations.filter((registration) => registration.event_id === activeEventId)
        : registrations,
    [activeEventId, registrations],
  );

  const cabinNameById = useMemo(
    () => new Map(cabins.map((cabin) => [cabin.id, cabin.name])),
    [cabins],
  );

  function startPlacement(cabin: Cabin) {
    setPlacingCabinId(cabin.id);
    setSelectedSlotId(
      cabin.map_slot_id,
    );
    setError(null);
  }

  function chooseSlot(
    slot: CampMapCabinFeature,
  ) {
    if (!placingCabin) {
      return;
    }

    const owner = slotOwners.get(slot.id);

    if (
      owner &&
      owner.id !== placingCabin.id
    ) {
      setError(
        `${owner.name} already uses that map cabin.`,
      );
      return;
    }

    setSelectedSlotId(slot.id);
    setError(null);
  }

  function savePlacement() {
    if (
      !placingCabin ||
      !selectedSlotId
    ) {
      setError(
        "Choose a cabin building on the map.",
      );
      return;
    }

    const owner =
      slotOwners.get(selectedSlotId);

    if (
      owner &&
      owner.id !== placingCabin.id
    ) {
      setError(
        `${owner.name} already uses that map cabin.`,
      );
      return;
    }

    void run(async () => {
      await updateCabin(
        placingCabin.id,
        {
          map_slot_id:
            selectedSlotId,
        },
      );

      setPlacingCabinId(null);
      setSelectedSlotId(null);
    });
  }

  function assignmentsFor(
    cabinId: string,
  ) {
    return registrations.filter(
      (registration) =>
        registration.cabin_id === cabinId &&
        (!activeEventId || registration.event_id === activeEventId),
    );
  }

  return (
    <section className="app-card cabins-card cabins-workspace">
      <div className="app-card-head cabins-head">
        <div>
          <strong>Cabins on the camp map</strong>
          <span>
            Assign households to real cabins. Choose a household on an available cabin to move them there.
          </span>
        </div>

        <button
          className="app-button"
          type="button"
          onClick={() => setShowManageCabins((open) => !open)}
        >
          {showManageCabins ? "Close cabin setup" : "Manage cabins"}
        </button>
      </div>

      {error && <div className="app-alert app-alert-danger cabin-error">{error}</div>}

      {showManageCabins && (
        <div className="cabin-management-panel">
          <form className="admin-form cabin-create-form" onSubmit={submit}>
            <label>
              <span>Cabin name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Cabin 14" />
            </label>
            <label>
              <span>Area</span>
              <select value={areaId} onChange={(event) => setAreaId(event.target.value)}>
                <option value="">No area</option>
                {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
              </select>
            </label>
            <button className="app-button app-button-primary" type="submit">Add cabin</button>
          </form>
        </div>
      )}

      <div className="cabin-overview-layout">
        <div className="cabin-overview-map">
          <svg
            className="cabin-map-overview-svg"
            viewBox={`0 0 ${CAMP_MAP_WIDTH} ${CAMP_MAP_HEIGHT}`}
            role="img"
            aria-label="Camp cabin assignments"
          >
            <CampMapBase />

            {CAMP_MAP_CABINS.map((slot) => {
              const owner = slotOwners.get(slot.id);
              const assignments = owner ? assignmentsFor(owner.id) : [];
              const assignment = assignments[0] ?? null;
              const centerX = slot.x + slot.width / 2;

              return (
                <g
                  className={`cabin-overview-slot ${owner ? "placed" : "empty"} ${assignment ? "assigned" : ""}`}
                  key={slot.id}
                >
                  <CampCabinShape
                    slot={slot}
                    className="cabin-overview-glyph"
                  />
                  {owner && (
                    <text x={centerX} y={slot.y - 8}>
                      {owner.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="cabin-assignment-summary-list">
          {cabins.map((cabin) => {
            const assignments = assignmentsFor(cabin.id);
            const assignment = assignments[0] ?? null;
            const slot = cabinSlots.get(cabin.id);

            return (
              <div className="cabin-summary-row" key={cabin.id}>
                <div>
                  <strong>{cabin.name}</strong>
                  <span>{slot ? "On map" : "Map location not set"}</span>
                </div>

                <label className="cabin-household-picker">
                  <small>Household</small>
                  <select
                    aria-label={`Household assigned to ${cabin.name}`}
                    value={assignment?.id ?? ""}
                    onChange={(event) => {
                      const registrationId = event.target.value;

                      if (!registrationId) {
                        if (assignment) {
                          void run(() => assignRegistrationCabin(assignment.id, null));
                        }
                        return;
                      }

                      void run(() =>
                        assignRegistrationCabin(registrationId, Number(cabin.id)),
                      );
                    }}
                  >
                    <option value="">Available</option>
                    {activeRegistrations.map((registration) => {
                      const currentCabin = registration.cabin_id
                        ? cabinNameById.get(registration.cabin_id)
                        : null;
                      const isCurrent = registration.id === assignment?.id;

                      return (
                        <option
                          key={registration.id}
                          value={registration.id}
                          disabled={Boolean(assignment) && !isCurrent}
                        >
                          {registration.household_name ?? registration.username}
                          {!isCurrent && currentCabin ? ` · move from ${currentCabin}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <details className="admin-setup-disclosure cabin-records-disclosure">
        <summary>
          <div>
            <strong>Cabin records</strong>
            <span>{cabins.length} reusable cabins · edit names, areas, or delete unused cabins.</span>
          </div>
          <b>Manage records</b>
        </summary>

        {cabins.length ? (
          <div className="cabin-manage-list">
            {cabins.map((cabin) => {
              const assignments = assignmentsFor(cabin.id);
              const slot = cabinSlots.get(cabin.id);

              return (
                <div className="cabin-manage-row" key={cabin.id}>
                  <div className="cabin-manage-fields">
                    <input
                      aria-label="Cabin name"
                      defaultValue={cabin.name}
                      onBlur={(event) => {
                        const next = event.target.value.trim();
                        if (next && next !== cabin.name) {
                          void run(() => updateCabin(cabin.id, { name: next }));
                        }
                      }}
                    />
                    <select
                      aria-label="Cabin area"
                      value={cabin.area_id ?? ""}
                      onChange={(event) =>
                        void run(() =>
                          updateCabin(cabin.id, {
                            area_id: event.target.value ? Number(event.target.value) : null,
                          }),
                        )
                      }
                    >
                      <option value="">No area</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>{area.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="cabin-assignment-summary">
                    {assignments.length ? (
                      <div className="cabin-assignment-list">
                        {assignments.map((item) => (
                          <span key={item.id}>
                            <strong>{item.household_name ?? item.username}</strong>
                            <small>{item.event_name}</small>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="cabin-available">Available</span>
                    )}
                  </div>

                  <div className="cabin-map-status">
                    <span className={slot ? "placed" : "unplaced"}>
                      {slot ? "On map" : "Not placed"}
                    </span>
                    <button className="app-button" type="button" onClick={() => startPlacement(cabin)}>
                      {slot ? "Map location" : "Place on map"}
                    </button>
                  </div>

                  <div className="cabin-manage-actions">
                    <button
                      className="app-button app-button-danger"
                      type="button"
                      disabled={assignments.length > 0}
                      title={assignments.length ? "Reassign or unassign this cabin before deleting it" : undefined}
                      onClick={() => void run(() => deleteCabin(cabin.id))}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="app-empty">No cabins yet.</div>
        )}
      </details>

      {placingCabin && (
        <div
          className="app-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPlacingCabinId(null);
              setSelectedSlotId(null);
            }
          }}
        >
          <section
            className="app-modal cabin-map-picker"
            role="dialog"
            aria-modal="true"
            aria-label={`Place ${placingCabin.name}`}
          >
          <div className="cabin-map-picker-head">
            <div>
              <strong>Place {placingCabin.name}</strong>
              <span>Choose the actual cabin building. Occupied map cabins cannot be reused.</span>
            </div>
            <div className="cabin-map-picker-actions">
              <button
                type="button"
                className="app-button"
                onClick={() => {
                  setPlacingCabinId(null);
                  setSelectedSlotId(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="app-button app-button-primary"
                disabled={!selectedSlotId}
                onClick={savePlacement}
              >
                Save location
              </button>
            </div>
          </div>

          <div className="cabin-map-picker-shell">
            <svg
              className="cabin-map-picker-svg cabin-slot-picker-svg"
              viewBox={`0 0 ${CAMP_MAP_WIDTH} ${CAMP_MAP_HEIGHT}`}
              role="img"
              aria-label={`Choose the physical map cabin for ${placingCabin.name}`}
            >
              <CampMapBase />
              {CAMP_MAP_CABINS.map((slot) => {
                const owner = slotOwners.get(slot.id);
                const isSelected = selectedSlotId === slot.id;
                const unavailable = Boolean(owner) && owner?.id !== placingCabin.id;
                const centerX = slot.x + slot.width / 2;

                return (
                  <g
                    className={`cabin-slot-picker ${isSelected ? "selected" : ""} ${unavailable ? "unavailable" : ""}`}
                    key={slot.id}
                    role="button"
                    tabIndex={unavailable ? -1 : 0}
                    aria-label={
                      unavailable
                        ? `Map cabin already used by ${owner?.name}`
                        : isSelected
                          ? `${placingCabin.name} selected here`
                          : "Available map cabin"
                    }
                    onClick={() => !unavailable && chooseSlot(slot)}
                    onKeyDown={(event) => {
                      if (!unavailable && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        chooseSlot(slot);
                      }
                    }}
                  >
                    <CampCabinShape
                      slot={slot}
                      className="cabin-picker-glyph"
                    />
                    {(owner || isSelected) && (
                      <text x={centerX} y={slot.y - 8}>
                        {isSelected ? placingCabin.name : owner?.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          </section>
        </div>
      )}
    </section>
  );
}
