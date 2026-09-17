import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  MemberDirectoryHousehold,
} from "@appoponi/shared/schemas/registration";

import {
  loadMemberDirectory,
  updateMemberDirectorySharing,
} from "../api/member";

import {
  isOfflineFetchFailure,
  readOfflineCache,
  saveOfflineCache,
} from "../lib/offlineCache";

type Props = {
  eventId: string;
  cacheIdentity: string;
  changesUnavailable: boolean;
};

function countLabel(
  count: number,
  singular: string,
  plural: string,
) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function MemberDirectory({
  eventId,
  cacheIdentity,
  changesUnavailable,
}: Props) {
  const [households, setHouseholds] =
    useState<MemberDirectoryHousehold[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [usingCachedDirectory, setUsingCachedDirectory] =
    useState(false);

  const [sharingBusy, setSharingBusy] =
    useState(false);

  function cacheKey() {
    return `member-directory:${cacheIdentity}:${eventId}`;
  }

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setSearch("");
    setHouseholds([]);
    setUsingCachedDirectory(false);

    void loadMemberDirectory(eventId)
      .then((next) => {
        if (cancelled) {
          return;
        }

        setHouseholds(next);
        setUsingCachedDirectory(false);
        saveOfflineCache(
          cacheKey(),
          next,
        );
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        const cached =
          readOfflineCache<
            MemberDirectoryHousehold[]
          >(cacheKey());

        if (
          isOfflineFetchFailure(err) &&
          cached
        ) {
          setHouseholds(cached.value);
          setUsingCachedDirectory(true);
          return;
        }

        setHouseholds([]);
        setError(
          err instanceof Error
            ? err.message
            : "Could not load the event directory",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, cacheIdentity]);

  const ownHousehold =
    households.find(
      (item) => item.is_own_household,
    ) ?? null;

  const totalPeople = households.reduce(
    (sum, item) =>
      sum + item.members.length,
    0,
  );

  const filteredHouseholds = useMemo(() => {
    const term = search
      .trim()
      .toLowerCase();

    if (!term) {
      return households;
    }

    return households.filter((item) =>
      [
        item.household_name,
        item.cabin_name ?? "",
        ...item.members.map(
          (member) => member.full_name,
        ),
      ].some((value) =>
        value
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [households, search]);

  async function toggleCabinSharing() {
    if (!ownHousehold) {
      return;
    }

    setSharingBusy(true);
    setError(null);

    try {
      const next =
        !ownHousehold.cabin_shared;

      const updated =
        await updateMemberDirectorySharing(
          eventId,
          next,
        );

      setHouseholds((current) => {
        const changed = current.map(
          (item) =>
            item.is_own_household
              ? {
                  ...item,
                  cabin_shared:
                    updated.share_cabin_publicly,
                }
              : item,
        );

        saveOfflineCache(
          cacheKey(),
          changed,
        );

        return changed;
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update cabin visibility",
      );
    } finally {
      setSharingBusy(false);
    }
  }

  return (
    <section className="app-card member-card member-directory-card">
      <div className="app-card-head member-directory-head">
        <div>
          <strong>Who&apos;s here</strong>
          <span>
            {loading
              ? "Loading directory…"
              : `${countLabel(households.length, "household", "households")} · ${countLabel(totalPeople, "guest", "guests")}`}
            {usingCachedDirectory
              ? " · saved copy"
              : ""}
          </span>
        </div>
      </div>

      {ownHousehold?.cabin_name && (
        <div className="member-directory-privacy">
          <div>
            <strong>Cabin in directory</strong>
            <span>
              {ownHousehold.cabin_shared
                ? `${ownHousehold.cabin_name} is visible to other households at this event.`
                : `${ownHousehold.cabin_name} is visible only to your household.`}
            </span>
          </div>

          <button
            type="button"
            className="app-button"
            disabled={
              changesUnavailable ||
              sharingBusy
            }
            onClick={() =>
              void toggleCabinSharing()
            }
          >
            {sharingBusy
              ? "Saving…"
              : ownHousehold.cabin_shared
                ? "Hide cabin"
                : "Share cabin"}
          </button>
        </div>
      )}

      {households.length > 4 && (
        <div className="member-directory-search">
          <input
            aria-label="Search event directory"
            type="search"
            placeholder="Find a household or guest"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>
      )}

      {error && (
        <div className="app-alert app-alert-danger member-directory-error">
          {error}
        </div>
      )}

      {!loading &&
      !error &&
      filteredHouseholds.length === 0 ? (
        <div className="app-empty app-empty-compact">
          {search
            ? "No households or guests match that search."
            : "No households are in this event yet."}
        </div>
      ) : (
        <div className="member-directory-list">
          {filteredHouseholds.map(
            (item) => (
              <article
                className="member-directory-household"
                key={item.registration_id}
              >
                <div className="member-directory-household-head">
                  <div>
                    <strong>
                      {item.household_name}
                    </strong>

                    <span>
                      {countLabel(
                        item.members.length,
                        "guest",
                        "guests",
                      )}
                      {item.is_own_household
                        ? " · Your household"
                        : ""}
                    </span>
                  </div>

                  {item.cabin_name && (
                    <small>
                      {item.cabin_name}
                    </small>
                  )}
                </div>

                {item.members.length ? (
                  <div className="member-directory-people">
                    {item.members.map(
                      (member) => (
                        <span
                          key={member.attendee_id}
                        >
                          {member.full_name}
                        </span>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="member-directory-no-guests">
                    Guest names not selected yet.
                  </div>
                )}
              </article>
            ),
          )}
        </div>
      )}

      <div className="member-directory-privacy-note">
        The directory shares household and attending guest names only. Contact and dietary details stay private.
      </div>
    </section>
  );
}
