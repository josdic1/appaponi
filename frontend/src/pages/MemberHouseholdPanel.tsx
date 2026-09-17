import {
  useEffect,
  useState,
} from "react";

import type {
  HouseholdMember,
  MemberRole,
} from "@appoponi/shared/schemas/householdMembers";

import {
  addOwnHouseholdMember,
  deleteOwnHouseholdMember,
  makeOwnHouseholdPrimary,
  updateOwnHousehold,
  updateOwnHouseholdMember,
} from "../api/member";

type Props = {
  household: HouseholdMember[];
  disabled: boolean;
  onChanged: () => Promise<void>;
};

type PersonDraft = {
  full_name: string;
  email: string;
  phone: string;
  dietary_restrictions: string;
  member_role: "adult" | "child";
};

const emptyDraft: PersonDraft = {
  full_name: "",
  email: "",
  phone: "",
  dietary_restrictions: "",
  member_role: "adult",
};

function roleLabel(
  role: MemberRole,
) {
  if (role === "primary") {
    return "Default lead";
  }

  return (
    role.charAt(0).toUpperCase() +
    role.slice(1)
  );
}

export default function MemberHouseholdPanel({
  household,
  disabled,
  onChanged,
}: Props) {
  const householdName =
    household[0]?.household_name ??
    "";

  const [
    editingHouseholdName,
    setEditingHouseholdName,
  ] = useState(false);

  const [
    householdNameDraft,
    setHouseholdNameDraft,
  ] = useState(householdName);

  const [adding, setAdding] =
    useState(false);

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(
    null,
  );

  const [draft, setDraft] =
    useState<PersonDraft>(
      emptyDraft,
    );

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    setHouseholdNameDraft(
      householdName,
    );
  }, [householdName]);

  function beginAdd() {
    setDraft(emptyDraft);
    setEditingId(null);
    setAdding(true);
    setError(null);
  }

  function beginEdit(
    person: HouseholdMember,
  ) {
    setDraft({
      full_name:
        person.full_name,
      email:
        person.email ?? "",
      phone:
        person.phone ?? "",
      dietary_restrictions:
        person
          .dietary_restrictions ??
        "",
      member_role:
        person.member_role ===
        "child"
          ? "child"
          : "adult",
    });

    setAdding(false);
    setEditingId(person.id);
    setError(null);
  }

  function closePersonForm() {
    setAdding(false);
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
  }

  async function saveHouseholdName() {
    setBusy(true);
    setError(null);

    try {
      await updateOwnHousehold({
        household_name:
          householdNameDraft,
      });

      await onChanged();
      setEditingHouseholdName(
        false,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update household",
      );
    } finally {
      setBusy(false);
    }
  }

  async function savePerson() {
    setBusy(true);
    setError(null);

    try {
      if (editingId) {
        await updateOwnHouseholdMember(
          editingId,
          {
            full_name:
              draft.full_name,
            email:
              draft.email.trim() ||
              null,
            phone:
              draft.phone.trim() ||
              null,
            dietary_restrictions:
              draft
                .dietary_restrictions
                .trim() ||
              null,
          },
        );
      } else {
        await addOwnHouseholdMember({
          full_name:
            draft.full_name,
          member_role:
            draft.member_role,
          ...(draft.email.trim()
            ? {
                email:
                  draft.email.trim(),
              }
            : {}),
          ...(draft.phone.trim()
            ? {
                phone:
                  draft.phone.trim(),
              }
            : {}),
          ...(draft
            .dietary_restrictions
            .trim()
            ? {
                dietary_restrictions:
                  draft
                    .dietary_restrictions
                    .trim(),
              }
            : {}),
        });
      }

      await onChanged();
      closePersonForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save person",
      );
    } finally {
      setBusy(false);
    }
  }

  async function makePrimary(
    person: HouseholdMember,
  ) {
    if (
      !window.confirm(
        `Make ${person.full_name} the default household lead? The current default lead will remain an Adult.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await makeOwnHouseholdPrimary(
        person.id,
      );

      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not change default household lead",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removePerson(
    person: HouseholdMember,
  ) {
    if (
      !window.confirm(
        `Remove ${person.full_name} from this household?`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await deleteOwnHouseholdMember(
        person.id,
      );

      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not remove person",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="app-card member-card member-household-card">
      <div className="app-card-head member-household-head">
        <div>
          <strong>
            Your household
          </strong>

          <span>
            {household.length}{" "}
            {household.length === 1
              ? "person"
              : "people"}
          </span>
        </div>

        <button
          className="app-button"
          type="button"
          disabled={
            disabled || busy
          }
          onClick={beginAdd}
        >
          Add person
        </button>
      </div>

      <div className="member-household-name">
        {editingHouseholdName ? (
          <>
            <input
              value={
                householdNameDraft
              }
              onChange={(event) =>
                setHouseholdNameDraft(
                  event.target.value,
                )
              }
            />

            <button
              className="app-button"
              type="button"
              disabled={
                busy ||
                !householdNameDraft.trim()
              }
              onClick={() =>
                void saveHouseholdName()
              }
            >
              Save
            </button>

            <button
              className="app-button"
              type="button"
              disabled={busy}
              onClick={() => {
                setHouseholdNameDraft(
                  householdName,
                );
                setEditingHouseholdName(
                  false,
                );
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <div>
              <small>
                Household name
              </small>

              <strong>
                {householdName}
              </strong>
            </div>

            <button
              className="app-button"
              type="button"
              disabled={
                disabled || busy
              }
              onClick={() =>
                setEditingHouseholdName(
                  true,
                )
              }
            >
              Edit
            </button>
          </>
        )}
      </div>

      <div className="member-household-people">
        {household.map(
          (person) => (
            <div
              className="member-household-person"
              key={person.id}
            >
              <div className="member-household-person-main">
                <div className="member-household-avatar">
                  {person.full_name
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="member-household-person-copy">
                  <div className="member-household-person-title">
                    <strong>
                      {person.full_name}
                    </strong>

                    <span className={`member-household-role ${person.member_role}`}>
                      {roleLabel(
                        person.member_role,
                      )}
                    </span>
                  </div>

                  <small>
                    {[
                      person.email,
                      person.phone,
                      person
                        .dietary_restrictions,
                    ]
                      .filter(Boolean)
                      .join(" · ") ||
                      "No additional details"}
                  </small>
                </div>
              </div>

              <div className="member-household-person-actions">
                <button
                  className="app-button"
                  type="button"
                  disabled={
                    disabled ||
                    busy
                  }
                  onClick={() =>
                    beginEdit(person)
                  }
                >
                  Edit
                </button>

                {person.member_role ===
                  "adult" && (
                  <button
                    type="button"
                    className="app-button member-household-primary-action"
                    disabled={
                      disabled ||
                      busy
                    }
                    onClick={() =>
                      void makePrimary(
                        person,
                      )
                    }
                  >
                    Make default lead
                  </button>
                )}

                {person.member_role !==
                  "primary" && (
                  <button
                    type="button"
                    className="app-button app-button-danger member-household-remove-action"
                    disabled={
                      disabled ||
                      busy
                    }
                    onClick={() =>
                      void removePerson(
                        person,
                      )
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      {(adding || editingId) && (
        <div className="member-household-form">
          <div className="member-household-form-head">
            <div>
              <strong>
                {editingId
                  ? "Edit person"
                  : "Add person"}
              </strong>

              <span>
                {editingId
                  ? "Update this household profile."
                  : "Add an Adult or Child to your household."}
              </span>
            </div>
          </div>

          <div className="member-household-form-grid">
            <label>
              <span>
                Full name
              </span>

              <input
                autoFocus
                value={
                  draft.full_name
                }
                onChange={(event) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      full_name:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            {!editingId && (
              <label>
                <span>Role</span>

                <select
                  value={
                    draft.member_role
                  }
                  onChange={(event) =>
                    setDraft(
                      (current) => ({
                        ...current,
                        member_role:
                          event.target
                            .value as
                            | "adult"
                            | "child",
                      }),
                    )
                  }
                >
                  <option value="adult">
                    Adult
                  </option>

                  <option value="child">
                    Child
                  </option>
                </select>
              </label>
            )}

            <label>
              <span>Email</span>

              <input
                type="email"
                value={draft.email}
                onChange={(event) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      email:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <label>
              <span>Phone</span>

              <input
                value={draft.phone}
                onChange={(event) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      phone:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <label className="member-household-dietary">
              <span>
                Dietary notes
              </span>

              <input
                value={
                  draft
                    .dietary_restrictions
                }
                onChange={(event) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      dietary_restrictions:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>
          </div>

          {error && (
            <div className="app-alert app-alert-danger">
              {error}
            </div>
          )}

          <div className="member-household-form-actions">
            <button
              type="button"
              className="app-button app-button-primary"
              disabled={
                busy ||
                !draft.full_name.trim()
              }
              onClick={() =>
                void savePerson()
              }
            >
              {busy
                ? "Saving…"
                : "Save changes"}
            </button>

            <button
              type="button"
              className="app-button"
              disabled={busy}
              onClick={
                closePersonForm
              }
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error &&
        !adding &&
        !editingId && (
          <div className="app-alert app-alert-danger member-household-error">
            {error}
          </div>
        )}
    </section>
  );
}
