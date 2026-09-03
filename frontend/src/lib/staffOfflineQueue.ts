import type {
  StaffParticipant,
} from "@appoponi/shared/schemas/staffDay";

export type StaffOfflineAction = {
  signup_id: string;
  action: "check-in" | "check-out";
  queued_at: string;
};

const PREFIX =
  "appoponi:staff-offline:v1:";

function storageKey(
  username: string,
) {
  return `${PREFIX}${username}`;
}

export function readStaffOfflineQueue(
  username: string,
): StaffOfflineAction[] {
  try {
    const raw =
      localStorage.getItem(
        storageKey(username),
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (
        item,
      ): item is StaffOfflineAction =>
        Boolean(
          item &&
            typeof item.signup_id ===
              "string" &&
            (
              item.action ===
                "check-in" ||
              item.action ===
                "check-out"
            ) &&
            typeof item.queued_at ===
              "string",
        ),
    );
  } catch {
    return [];
  }
}

export function saveStaffOfflineQueue(
  username: string,
  actions: StaffOfflineAction[],
) {
  try {
    if (!actions.length) {
      localStorage.removeItem(
        storageKey(username),
      );
      return;
    }

    localStorage.setItem(
      storageKey(username),
      JSON.stringify(actions),
    );
  } catch {
    // Queue persistence must not break staff check-in.
  }
}

export function enqueueStaffOfflineAction(
  username: string,
  signupId: string,
  action:
    | "check-in"
    | "check-out",
) {
  const current =
    readStaffOfflineQueue(
      username,
    );

  const next = [
    ...current,
    {
      signup_id: signupId,
      action,
      queued_at:
        new Date().toISOString(),
    },
  ];

  saveStaffOfflineQueue(
    username,
    next,
  );

  return next;
}

export function applyStaffOfflineActions(
  participants: StaffParticipant[],
  actions: StaffOfflineAction[],
) {
  return participants.map(
    (participant) => {
      const next = {
        ...participant,
      };

      for (const action of actions) {
        if (
          action.signup_id !==
          participant.signup_id
        ) {
          continue;
        }

        if (
          action.action ===
          "check-in"
        ) {
          if (
            !next.checked_out_at
          ) {
            next.checked_in_at =
              next.checked_in_at ??
              action.queued_at;
          }

          continue;
        }

        next.checked_in_at =
          next.checked_in_at ??
          action.queued_at;

        next.checked_out_at =
          next.checked_out_at ??
          action.queued_at;
      }

      return next;
    },
  );
}
