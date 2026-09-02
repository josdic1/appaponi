import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import type {
  Cabin,
} from "@appoponi/shared/schemas/cabins";

import type {
  Area,
} from "@appoponi/shared/schemas/areas";

import {
  createCabin,
  deleteCabin,
  loadCabinAreas,
  loadCabins,
  updateCabin,
} from "../api/admin";

type Props = {
  onChanged?: () => void;
};

export default function AdminCabinsPanel({
  onChanged,
}: Props) {
  const [cabins, setCabins] =
    useState<Cabin[]>([]);

  const [areas, setAreas] =
    useState<Area[]>([]);

  const [name, setName] =
    useState("");

  const [areaId, setAreaId] =
    useState("");

  const [mapX, setMapX] =
    useState("");

  const [mapY, setMapY] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  async function refresh() {
    const [
      nextCabins,
      nextAreas,
    ] = await Promise.all([
      loadCabins(),
      loadCabinAreas(),
    ]);

    setCabins(nextCabins);
    setAreas(nextAreas);
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

  function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Cabin name is required.");
      return;
    }

    void run(async () => {
      await createCabin({
        name: name.trim(),
        area_id: areaId
          ? Number(areaId)
          : null,
        map_x:
          mapX === ""
            ? null
            : Number(mapX),
        map_y:
          mapY === ""
            ? null
            : Number(mapY),
      });

      setName("");
      setAreaId("");
      setMapX("");
      setMapY("");
    });
  }

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <strong>Cabins</strong>

          <span>
            Lodging and map placement.
          </span>
        </div>
      </div>

      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      <form
        className="admin-form"
        onSubmit={submit}
      >
        <label>
          <span>Cabin name</span>

          <input
            value={name}
            onChange={(event) =>
              setName(
                event.target.value,
              )
            }
            placeholder="Cabin 14"
          />
        </label>

        <label>
          <span>Area</span>

          <select
            value={areaId}
            onChange={(event) =>
              setAreaId(
                event.target.value,
              )
            }
          >
            <option value="">
              No area
            </option>

            {areas.map((area) => (
              <option
                key={area.id}
                value={area.id}
              >
                {area.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Map X</span>

          <input
            type="number"
            min="0"
            max="1"
            step="0.001"
            value={mapX}
            onChange={(event) =>
              setMapX(
                event.target.value,
              )
            }
            placeholder="0–1"
          />
        </label>

        <label>
          <span>Map Y</span>

          <input
            type="number"
            min="0"
            max="1"
            step="0.001"
            value={mapY}
            onChange={(event) =>
              setMapY(
                event.target.value,
              )
            }
            placeholder="0–1"
          />
        </label>

        <button
          className="admin-primary"
          type="submit"
        >
          Add cabin
        </button>
      </form>

      <div className="registration-list">
        {cabins.length ? (
          cabins.map((cabin) => (
            <div
              className="registration-row"
              key={cabin.id}
            >
              <label>
                <small>Name</small>

                <input
                  defaultValue={
                    cabin.name
                  }
                  onBlur={(event) => {
                    const next =
                      event.target
                        .value.trim();

                    if (
                      next &&
                      next !==
                        cabin.name
                    ) {
                      void run(() =>
                        updateCabin(
                          cabin.id,
                          {
                            name: next,
                          },
                        ),
                      );
                    }
                  }}
                />
              </label>

              <label>
                <small>Area</small>

                <select
                  value={
                    cabin.area_id ??
                    ""
                  }
                  onChange={(event) =>
                    void run(() =>
                      updateCabin(
                        cabin.id,
                        {
                          area_id:
                            event
                              .target
                              .value
                              ? Number(
                                  event
                                    .target
                                    .value,
                                )
                              : null,
                        },
                      ),
                    )
                  }
                >
                  <option value="">
                    None
                  </option>

                  {areas.map(
                    (area) => (
                      <option
                        key={
                          area.id
                        }
                        value={
                          area.id
                        }
                      >
                        {
                          area.name
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <small>X</small>

                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.001"
                  defaultValue={
                    cabin.map_x ??
                    ""
                  }
                  onBlur={(event) =>
                    void run(() =>
                      updateCabin(
                        cabin.id,
                        {
                          map_x:
                            event
                              .target
                              .value ===
                            ""
                              ? null
                              : Number(
                                  event
                                    .target
                                    .value,
                                ),
                        },
                      ),
                    )
                  }
                />
              </label>

              <label>
                <small>Y</small>

                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.001"
                  defaultValue={
                    cabin.map_y ??
                    ""
                  }
                  onBlur={(event) =>
                    void run(() =>
                      updateCabin(
                        cabin.id,
                        {
                          map_y:
                            event
                              .target
                              .value ===
                            ""
                              ? null
                              : Number(
                                  event
                                    .target
                                    .value,
                                ),
                        },
                      ),
                    )
                  }
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  void run(() =>
                    deleteCabin(
                      cabin.id,
                    ),
                  )
                }
              >
                Delete
              </button>
            </div>
          ))
        ) : (
          <div className="admin-empty">
            No cabins yet.
          </div>
        )}
      </div>
    </section>
  );
}
