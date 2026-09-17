import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import type { Area } from "@appoponi/shared/schemas/areas";
import type { Activity } from "@appoponi/shared/schemas/activities";
import type { EventRecord } from "@appoponi/shared/schemas/events";
import type { StaffMember } from "@appoponi/shared/schemas/staffMembers";
import type { Qualification } from "@appoponi/shared/schemas/qualifications";
import type {
  ActivityQualification,
  EventActivity,
  EventActivityStaff,
  StaffArea,
  StaffQualification,
} from "@appoponi/shared/schemas/scheduling";

import {
  loadAreas,
  loadActivities,
  loadEvents,
} from "../api/operations";

import {
  loadStaffMembers,
} from "../api/admin";

import {
  addActivityQualification,
  addEventActivity,
  addStaffArea,
  addStaffQualification,
  assignEventActivityStaff,
  createQualification,
  loadQualifications,
  loadScheduling,
  removeActivityQualification,
  removeEventActivity,
  removeEventActivityStaff,
  removeQualification,
  removeStaffArea,
  removeStaffQualification,
} from "../api/scheduling";

import HumanDateTimeInput from "../components/HumanDateTimeInput";
import {
  humanDateTimeToIso,
} from "../lib/humanDateTime";

type Props = {
  activeEventId?: string;
};

function scheduleDayKey(value: string) {
  const date = new Date(value);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function scheduleDayLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function scheduleTimeLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminSchedulingPage({
  activeEventId = "",
}: Props) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [qualifications, setQualifications] =
    useState<Qualification[]>([]);

  const [staffAreas, setStaffAreas] =
    useState<StaffArea[]>([]);

  const [staffQualifications, setStaffQualifications] =
    useState<StaffQualification[]>([]);

  const [
    activityQualifications,
    setActivityQualifications,
  ] = useState<ActivityQualification[]>([]);

  const [eventActivities, setEventActivities] =
    useState<EventActivity[]>([]);

  const [
    eventActivityStaff,
    setEventActivityStaff,
  ] = useState<EventActivityStaff[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  const [qualificationName, setQualificationName] =
    useState("");

  const [staffAreaStaff, setStaffAreaStaff] = useState("");
  const [staffAreaArea, setStaffAreaArea] = useState("");

  const [staffQualStaff, setStaffQualStaff] = useState("");
  const [staffQualQual, setStaffQualQual] = useState("");

  const [activityQualActivity, setActivityQualActivity] =
    useState("");
  const [activityQualQual, setActivityQualQual] =
    useState("");
  const [requiredCount, setRequiredCount] = useState("1");

  const [scheduleEvent, setScheduleEvent] = useState("");
  const [scheduleActivity, setScheduleActivity] = useState("");
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [scheduleCapacity, setScheduleCapacity] =
    useState("");
  const [isAddingActivity, setIsAddingActivity] = useState(false);

  const [editingActivityId, setEditingActivityId] =
    useState<string | null>(null);
  const [editingStaffId, setEditingStaffId] =
    useState("");

  async function refresh() {
    const [
      nextAreas,
      nextActivities,
      nextEvents,
      nextStaff,
      nextQualifications,
      scheduling,
    ] = await Promise.all([
      loadAreas(),
      loadActivities(),
      loadEvents(),
      loadStaffMembers(),
      loadQualifications(),
      loadScheduling(activeEventId || undefined),
    ]);

    setAreas(nextAreas);
    setActivities(nextActivities);
    setEvents(nextEvents);
    setStaff(nextStaff);
    setQualifications(nextQualifications);
    setStaffAreas(scheduling.staffAreas);
    setStaffQualifications(
      scheduling.staffQualifications,
    );
    setActivityQualifications(
      scheduling.activityQualifications,
    );
    setEventActivities(
      scheduling.eventActivities,
    );
    setEventActivityStaff(
      scheduling.eventActivityStaff,
    );
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load scheduling",
      ),
    );
  }, [activeEventId]);

  useEffect(() => {
    if (activeEventId) {
      setScheduleEvent(activeEventId);
    }
  }, [activeEventId]);

  const visibleEventActivities = activeEventId
    ? eventActivities.filter(
        (item) => item.event_id === activeEventId,
      )
    : eventActivities;

  const scheduleByDay = (() => {
    const groups = new Map<string, EventActivity[]>();

    for (const item of [...visibleEventActivities].sort(
      (a, b) =>
        new Date(a.starts_at).getTime() -
        new Date(b.starts_at).getTime(),
    )) {
      const key = scheduleDayKey(item.starts_at);
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }

    return Array.from(groups.entries());
  })();

  async function run(action: () => Promise<unknown>) {
    setError(null);

    try {
      await action();
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Request failed",
      );
    }
  }

  function confirmRemove(
    label: string,
    action: () => Promise<unknown>,
  ) {
    if (
      !window.confirm(
        `Remove ${label}?`,
      )
    ) {
      return;
    }

    void run(action);
  }

  function submitQualification(event: FormEvent) {
    event.preventDefault();

    void run(async () => {
      await createQualification(qualificationName);
      setQualificationName("");
    });
  }

  function submitStaffArea(event: FormEvent) {
    event.preventDefault();

    void run(async () => {
      await addStaffArea(
        Number(staffAreaStaff),
        Number(staffAreaArea),
      );
    });
  }

  function submitStaffQualification(event: FormEvent) {
    event.preventDefault();

    void run(async () => {
      await addStaffQualification(
        Number(staffQualStaff),
        Number(staffQualQual),
      );
    });
  }

  function submitActivityQualification(
    event: FormEvent,
  ) {
    event.preventDefault();

    void run(async () => {
      await addActivityQualification(
        Number(activityQualActivity),
        Number(activityQualQual),
        Number(requiredCount),
      );
    });
  }

  function submitSchedule(event: FormEvent) {
    event.preventDefault();

    void run(async () => {
      await addEventActivity({
        event_id: Number(scheduleEvent),
        activity_id: Number(scheduleActivity),
        starts_at:
          humanDateTimeToIso(
            scheduleStart,
            events.find(
              (item) =>
                item.id ===
                scheduleEvent,
            )?.starts_at,
          ),
        ends_at:
          humanDateTimeToIso(
            scheduleEnd,
            events.find(
              (item) =>
                item.id ===
                scheduleEvent,
            )?.starts_at,
          ),
        capacity: scheduleCapacity
          ? Number(scheduleCapacity)
          : null,
      });

      setScheduleStart("");
      setScheduleEnd("");
      setScheduleCapacity("");
      setIsAddingActivity(false);
    });
  }

  function submitActivityStaff(
    event: FormEvent,
    eventActivityId: string,
  ) {
    event.preventDefault();

    if (!editingStaffId) {
      return;
    }

    void run(async () => {
      await assignEventActivityStaff(
        Number(eventActivityId),
        Number(editingStaffId),
      );
      setEditingStaffId("");
    });
  }

  return (
    <section className="admin-workspace">
      <div className="admin-heading admin-heading-split">
        <div>
          <div className="admin-eyebrow">ADMIN</div>
          <h1>Schedule</h1>
          <p>
            See the event first. Add activities or change staffing only when you need to.
          </p>
        </div>

        <div className="action-disclosure schedule-add-control">
          <button
            className="app-button app-button-primary"
            type="button"
            aria-expanded={isAddingActivity}
            onClick={() => setIsAddingActivity((open) => !open)}
          >
            Add activity
          </button>
          {isAddingActivity && (
          <form
            className="admin-form action-disclosure-panel"
            onSubmit={submitSchedule}
          >
            <select
              value={scheduleEvent}
              onChange={(e) => setScheduleEvent(e.target.value)}
            >
              <option value="">Choose event</option>
              {events.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={scheduleActivity}
              onChange={(e) => setScheduleActivity(e.target.value)}
            >
              <option value="">Choose activity</option>
              {activities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <label>
              <span>Starts</span>
              <HumanDateTimeInput
                value={scheduleStart}
                onChange={setScheduleStart}
                defaultDate={
                  events.find((item) => item.id === scheduleEvent)?.starts_at
                }
              />
            </label>

            <label>
              <span>Ends</span>
              <HumanDateTimeInput
                value={scheduleEnd}
                onChange={setScheduleEnd}
                defaultDate={
                  events.find((item) => item.id === scheduleEvent)?.starts_at
                }
              />
            </label>

            <label>
              <span>Capacity</span>
              <input
                className="app-control-number"
                type="number"
                min="1"
                value={scheduleCapacity}
                onChange={(e) => setScheduleCapacity(e.target.value)}
                placeholder="Optional"
              />
            </label>

            <div className="schedule-add-actions">
              <button
                className="app-button"
                type="button"
                onClick={() => setIsAddingActivity(false)}
              >
                Cancel
              </button>
              <button className="app-button app-button-primary" type="submit">
                Add to schedule
              </button>
            </div>
          </form>
          )}
        </div>
      </div>

      {error && <div className="app-alert app-alert-danger">{error}</div>}

      <section className="app-card schedule-main-card schedule-first">
        <div className="app-card-head">
          <div>
            <strong>Activity schedule</strong>
            <span>{visibleEventActivities.length} scheduled activities</span>
          </div>
        </div>

        <div className="schedule-list schedule-list-primary">
          {scheduleByDay.length ? (
            scheduleByDay.map(([dayKey, dayActivities]) => (
              <section className="schedule-day-group" key={dayKey}>
                <div className="schedule-day-heading">
                  <strong>{scheduleDayLabel(dayActivities[0].starts_at)}</strong>
                  <span>{dayActivities.length} activities</span>
                </div>

                {dayActivities.map((item) => {
                  const assigned = eventActivityStaff.filter(
                    (staffAssignment) =>
                      staffAssignment.event_activity_id === item.id,
                  );
                  const isEditing = editingActivityId === item.id;

                  return (
                    <div className="schedule-activity-record" key={item.id}>
                      <div className="schedule-row">
                        <div className="schedule-row-time">
                          <strong>{scheduleTimeLabel(item.starts_at)}</strong>
                          <span>{scheduleTimeLabel(item.ends_at)}</span>
                        </div>

                        <div className="schedule-row-main">
                          <strong>{item.activity_name}</strong>
                          <span>{item.area_name}</span>
                          <small
                            className={assigned.length ? "schedule-staff-summary" : "schedule-unassigned"}
                          >
                            {assigned.length
                              ? `Staff · ${assigned.map((person) => person.staff_name).join(", ")}`
                              : "Unstaffed"}
                          </small>
                        </div>

                        <button
                          className="app-button schedule-row-edit"
                          type="button"
                          aria-expanded={isEditing}
                          onClick={() => {
                            setEditingActivityId(isEditing ? null : item.id);
                            setEditingStaffId("");
                          }}
                        >
                          {isEditing ? "Done" : "Edit"}
                        </button>
                      </div>

                      {isEditing && (
                        <div className="schedule-row-editor">
                          <div className="schedule-row-editor-main">
                            <strong>Staff</strong>
                            <div className="schedule-editor-staff-list">
                              {assigned.length ? (
                                assigned.map((person) => (
                                  <span className="schedule-assigned-person" key={person.id}>
                                    {person.staff_name}
                                    <button
                                      type="button"
                                      aria-label={`Remove ${person.staff_name}`}
                                      onClick={() =>
                                        confirmRemove(
                                          `${person.staff_name} from ${item.activity_name}`,
                                          () => removeEventActivityStaff(person.id),
                                        )
                                      }
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))
                              ) : (
                                <span className="schedule-unassigned">No staff assigned</span>
                              )}
                            </div>

                            <form
                              className="schedule-inline-staff-form"
                              onSubmit={(event) => submitActivityStaff(event, item.id)}
                            >
                              <select
                                aria-label={`Add staff to ${item.activity_name}`}
                                value={editingStaffId}
                                onChange={(event) => setEditingStaffId(event.target.value)}
                              >
                                <option value="">Add staff…</option>
                                {staff
                                  .filter(
                                    (person) =>
                                      !assigned.some(
                                        (assignment) =>
                                          assignment.staff_member_id === person.id,
                                      ),
                                  )
                                  .map((person) => (
                                    <option key={person.id} value={person.id}>
                                      {person.full_name}
                                    </option>
                                  ))}
                              </select>
                              <button
                                className="app-button app-button-primary"
                                type="submit"
                                disabled={!editingStaffId}
                              >
                                Add staff
                              </button>
                            </form>
                          </div>

                          <button
                            className="app-button app-button-danger schedule-delete-activity"
                            type="button"
                            onClick={() =>
                              confirmRemove(
                                `scheduled ${item.activity_name}`,
                                () => removeEventActivity(item.id),
                              )
                            }
                          >
                            Remove activity
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            ))
          ) : (
            <div className="app-empty">No scheduled activities yet.</div>
          )}
        </div>
      </section>

      <details className="admin-setup-disclosure" open>
        <summary>
          <div className="setup-disclosure-copy">
            <strong>Scheduling libraries</strong>
            <span>Reusable qualifications and activity staffing rules stay when events are cleared.</span>
          </div>
          <span className="setup-disclosure-badge">Reusable setup</span>
        </summary>

        <div className="setup-grid">
          <div className="setup-column">
          <section className="setup-section">
            <div className="setup-section-head">
              <div>
                <strong>Qualification library</strong>
                <span>{qualifications.length} reusable skill{qualifications.length === 1 ? "" : "s"}</span>
              </div>
            </div>

            <form className="admin-form compact-form compact-form-one" onSubmit={submitQualification}>
              <label>
                <span>Name</span>
                <input
                  value={qualificationName}
                  onChange={(e) => setQualificationName(e.target.value)}
                />
              </label>
              <button className="app-button app-button-primary" type="submit">
                Add
              </button>
            </form>

            <div className="compact-list">
              {qualifications.map((item) => (
                <div className="admin-inline-record" key={item.id}>
                  <span>{item.name}</span>
                  <button
                    className="app-button app-button-danger"
                    type="button"
                    onClick={() =>
                      confirmRemove(
                        `qualification "${item.name}"`,
                        () => removeQualification(item.id),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="setup-section">
            <div className="setup-section-head">
              <div>
                <strong>Staff → qualifications</strong>
                <span>{staffQualifications.length} current assignment{staffQualifications.length === 1 ? "" : "s"}</span>
              </div>
            </div>

            <form className="admin-form compact-form compact-form-two" onSubmit={submitStaffQualification}>
              <select
                value={staffQualStaff}
                onChange={(e) => setStaffQualStaff(e.target.value)}
              >
                <option value="">Choose staff</option>
                {staff.map((item) => (
                  <option key={item.id} value={item.id}>{item.full_name}</option>
                ))}
              </select>
              <select
                value={staffQualQual}
                onChange={(e) => setStaffQualQual(e.target.value)}
              >
                <option value="">Choose qualification</option>
                {qualifications.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <button className="app-button app-button-primary" type="submit">Assign</button>
            </form>

            <div className="compact-list">
              {staffQualifications.map((item) => (
                <div className="admin-inline-record" key={item.id}>
                  <span>{item.staff_name} → {item.qualification_name}</span>
                  <button
                    className="app-button app-button-danger"
                    type="button"
                    onClick={() =>
                      confirmRemove(
                        `${item.qualification_name} from ${item.staff_name}`,
                        () => removeStaffQualification(item.id),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
          </div>

          <div className="setup-column">
          <section className="setup-section">
            <div className="setup-section-head">
              <div>
                <strong>Staff → place assignments</strong>
                <span>{staffAreas.length} current assignment{staffAreas.length === 1 ? "" : "s"}</span>
              </div>
            </div>

            <form className="admin-form compact-form compact-form-two" onSubmit={submitStaffArea}>
              <select
                value={staffAreaStaff}
                onChange={(e) => setStaffAreaStaff(e.target.value)}
              >
                <option value="">Choose staff</option>
                {staff.map((item) => (
                  <option key={item.id} value={item.id}>{item.full_name}</option>
                ))}
              </select>
              <select
                value={staffAreaArea}
                onChange={(e) => setStaffAreaArea(e.target.value)}
              >
                <option value="">Choose area</option>
                {areas.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <button className="app-button app-button-primary" type="submit">Assign</button>
            </form>

            <div className="compact-list">
              {staffAreas.map((item) => (
                <div className="admin-inline-record" key={item.id}>
                  <span>{item.staff_name} → {item.area_name}</span>
                  <button
                    className="app-button app-button-danger"
                    type="button"
                    onClick={() =>
                      confirmRemove(
                        `${item.staff_name} from ${item.area_name}`,
                        () => removeStaffArea(item.id),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="setup-section">
            <div className="setup-section-head">
              <div>
                <strong>Activity requirement library</strong>
                <span>{activityQualifications.length} reusable staffing rule{activityQualifications.length === 1 ? "" : "s"}</span>
              </div>
            </div>

            <form className="admin-form compact-form compact-form-rule" onSubmit={submitActivityQualification}>
              <select
                value={activityQualActivity}
                onChange={(e) => setActivityQualActivity(e.target.value)}
              >
                <option value="">Choose activity</option>
                {activities.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <select
                value={activityQualQual}
                onChange={(e) => setActivityQualQual(e.target.value)}
              >
                <option value="">Choose qualification</option>
                {qualifications.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <label className="compact-number-field">
                <span>Required staff</span>
                <input
                  className="app-control-number"
                  type="number"
                  min="1"
                  value={requiredCount}
                  onChange={(e) => setRequiredCount(e.target.value)}
                />
              </label>
              <button className="app-button app-button-primary" type="submit">Add rule</button>
            </form>

            <div className="compact-list">
              {activityQualifications.map((item) => (
                <div className="admin-inline-record activity-requirement-row" key={item.id}>
                  <div>
                    <strong>{item.activity_name}</strong>
                    <span>{item.required_staff_count} × {item.qualification_name}</span>
                  </div>
                  <button
                    className="app-button app-button-danger"
                    type="button"
                    onClick={() =>
                      confirmRemove(
                        `${item.qualification_name} requirement from ${item.activity_name}`,
                        () => removeActivityQualification(item.id),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
          </div>
        </div>
      </details>
    </section>
  );
}
