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
} from "../api/scheduling";

export default function AdminSchedulingPage() {
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

  const [assignmentActivity, setAssignmentActivity] =
    useState("");
  const [assignmentStaff, setAssignmentStaff] =
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
      loadScheduling(),
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
  }, []);

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
        starts_at: new Date(
          scheduleStart,
        ).toISOString(),
        ends_at: new Date(
          scheduleEnd,
        ).toISOString(),
        capacity: scheduleCapacity
          ? Number(scheduleCapacity)
          : null,
      });

      setScheduleStart("");
      setScheduleEnd("");
      setScheduleCapacity("");
    });
  }

  function submitAssignment(event: FormEvent) {
    event.preventDefault();

    void run(async () => {
      await assignEventActivityStaff(
        Number(assignmentActivity),
        Number(assignmentStaff),
      );
    });
  }

  return (
    <section>
      <div className="admin-heading">
        <div className="admin-eyebrow">ADMIN</div>
        <h1>Scheduling</h1>
        <p>
          Qualifications, staff coverage, and the actual
          event activity calendar.
        </p>
      </div>

      {error && (
        <div className="admin-error">{error}</div>
      )}

      <div className="schedule-grid">
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <strong>Qualifications</strong>
              <span>{qualifications.length} defined</span>
            </div>
          </div>

          <form
            className="admin-form"
            onSubmit={submitQualification}
          >
            <label>
              <span>Name</span>
              <input
                value={qualificationName}
                onChange={(e) =>
                  setQualificationName(e.target.value)
                }
              />
            </label>

            <button
              className="admin-primary"
              type="submit"
            >
              Add qualification
            </button>
          </form>

          <div className="compact-list">
            {qualifications.map((item) => (
              <div key={item.id}>{item.name}</div>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <strong>Staff areas</strong>
              <span>{staffAreas.length} assignments</span>
            </div>
          </div>

          <form
            className="admin-form"
            onSubmit={submitStaffArea}
          >
            <select
              value={staffAreaStaff}
              onChange={(e) =>
                setStaffAreaStaff(e.target.value)
              }
            >
              <option value="">Choose staff</option>
              {staff.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name}
                </option>
              ))}
            </select>

            <select
              value={staffAreaArea}
              onChange={(e) =>
                setStaffAreaArea(e.target.value)
              }
            >
              <option value="">Choose area</option>
              {areas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <button
              className="admin-primary"
              type="submit"
            >
              Assign area
            </button>
          </form>

          <div className="compact-list">
            {staffAreas.map((item) => (
              <div key={item.id}>
                {item.staff_name} → {item.area_name}
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <strong>Staff qualifications</strong>
              <span>
                {staffQualifications.length} assignments
              </span>
            </div>
          </div>

          <form
            className="admin-form"
            onSubmit={submitStaffQualification}
          >
            <select
              value={staffQualStaff}
              onChange={(e) =>
                setStaffQualStaff(e.target.value)
              }
            >
              <option value="">Choose staff</option>
              {staff.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name}
                </option>
              ))}
            </select>

            <select
              value={staffQualQual}
              onChange={(e) =>
                setStaffQualQual(e.target.value)
              }
            >
              <option value="">
                Choose qualification
              </option>
              {qualifications.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <button
              className="admin-primary"
              type="submit"
            >
              Add qualification
            </button>
          </form>

          <div className="compact-list">
            {staffQualifications.map((item) => (
              <div key={item.id}>
                {item.staff_name} →{" "}
                {item.qualification_name}
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <strong>Activity requirements</strong>
              <span>
                {activityQualifications.length} rules
              </span>
            </div>
          </div>

          <form
            className="admin-form"
            onSubmit={submitActivityQualification}
          >
            <select
              value={activityQualActivity}
              onChange={(e) =>
                setActivityQualActivity(e.target.value)
              }
            >
              <option value="">Choose activity</option>
              {activities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={activityQualQual}
              onChange={(e) =>
                setActivityQualQual(e.target.value)
              }
            >
              <option value="">
                Choose qualification
              </option>
              {qualifications.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <label>
              <span>Required staff</span>
              <input
                type="number"
                min="1"
                value={requiredCount}
                onChange={(e) =>
                  setRequiredCount(e.target.value)
                }
              />
            </label>

            <button
              className="admin-primary"
              type="submit"
            >
              Add requirement
            </button>
          </form>

          <div className="compact-list">
            {activityQualifications.map((item) => (
              <div key={item.id}>
                {item.activity_name} →{" "}
                {item.required_staff_count} ×{" "}
                {item.qualification_name}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="admin-card schedule-main-card">
        <div className="admin-card-head">
          <div>
            <strong>Event activity schedule</strong>
            <span>
              Activities placed on the actual event calendar.
            </span>
          </div>
        </div>

        <div className="schedule-main-layout">
          <form
            className="admin-form"
            onSubmit={submitSchedule}
          >
            <select
              value={scheduleEvent}
              onChange={(e) =>
                setScheduleEvent(e.target.value)
              }
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
              onChange={(e) =>
                setScheduleActivity(e.target.value)
              }
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
              <input
                type="datetime-local"
                value={scheduleStart}
                onChange={(e) =>
                  setScheduleStart(e.target.value)
                }
              />
            </label>

            <label>
              <span>Ends</span>
              <input
                type="datetime-local"
                value={scheduleEnd}
                onChange={(e) =>
                  setScheduleEnd(e.target.value)
                }
              />
            </label>

            <label>
              <span>Capacity</span>
              <input
                type="number"
                min="1"
                value={scheduleCapacity}
                onChange={(e) =>
                  setScheduleCapacity(e.target.value)
                }
                placeholder="Optional"
              />
            </label>

            <button
              className="admin-primary"
              type="submit"
            >
              Schedule activity
            </button>
          </form>

          <div className="schedule-list">
            {eventActivities.length ? (
              eventActivities.map((item) => {
                const assigned =
                  eventActivityStaff.filter(
                    (staffAssignment) =>
                      staffAssignment.event_activity_id ===
                      item.id,
                  );

                return (
                  <div
                    className="schedule-row"
                    key={item.id}
                  >
                    <div>
                      <strong>
                        {item.activity_name}
                      </strong>
                      <span>
                        {item.event_name} · {item.area_name}
                      </span>
                      <small>
                        {new Date(
                          item.starts_at,
                        ).toLocaleString()}
                      </small>
                    </div>

                    <div className="schedule-assigned">
                      {assigned.map((person) => (
                        <span key={person.id}>
                          {person.staff_name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="admin-empty">
                No scheduled activities yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="admin-card schedule-main-card">
        <div className="admin-card-head">
          <div>
            <strong>Staff assignment</strong>
            <span>
              Put staff onto a scheduled activity.
            </span>
          </div>
        </div>

        <form
          className="admin-form schedule-assignment-form"
          onSubmit={submitAssignment}
        >
          <select
            value={assignmentActivity}
            onChange={(e) =>
              setAssignmentActivity(e.target.value)
            }
          >
            <option value="">
              Choose scheduled activity
            </option>
            {eventActivities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.event_name} · {item.activity_name}
              </option>
            ))}
          </select>

          <select
            value={assignmentStaff}
            onChange={(e) =>
              setAssignmentStaff(e.target.value)
            }
          >
            <option value="">Choose staff</option>
            {staff.map((item) => (
              <option key={item.id} value={item.id}>
                {item.full_name}
              </option>
            ))}
          </select>

          <button
            className="admin-primary"
            type="submit"
          >
            Assign staff
          </button>
        </form>
      </section>
    </section>
  );
}
