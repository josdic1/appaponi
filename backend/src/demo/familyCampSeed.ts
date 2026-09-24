const familyCampSeedTemplate = {
  "seed_name": "Family Camp 2026 demo",
  "event": {
    "name": "Family Camp 2026",
    "event_type": "Family Camp",
    "starts_at": "2026-08-19T11:00:00-04:00",
    "ends_at": "2026-08-22T11:15:00-04:00"
  },
  "staff": [
    {
      "username": "alex",
      "full_name": "Alex Belle",
      "babysitting_eligible": false,
      "qualifications": [
        "Waterskiing",
        "Lifeguard"
      ]
    },
    {
      "username": "quinn",
      "full_name": "Quinn Snowe",
      "babysitting_eligible": true,
      "qualifications": [
        "Waterskiing",
        "Lifeguard"
      ]
    },
    {
      "username": "lu",
      "full_name": "Lu Weeks",
      "babysitting_eligible": true,
      "qualifications": []
    }
  ],
  "households": [
    {
      "username": "dicker",
      "spots_paid_for": 3,
      "cabin": "Cabin 14",
      "people": [
        {
          "full_name": "Josh Dicker",
          "role": "primary",
          "email": "josh@demo.com"
        },
        {
          "full_name": "Dorrie Dicker",
          "role": "adult",
          "email": "dorrie@demo.com"
        },
        {
          "full_name": "Demi Dicker",
          "role": "child",
          "dietary_restrictions": "No peanuts"
        }
      ],
      "display_name": "Dicker Family"
    },
    {
      "username": "muskat",
      "spots_paid_for": 4,
      "cabin": "Cabin 15",
      "people": [
        {
          "full_name": "Jake Muskat",
          "role": "primary",
          "email": "jake@demo.com"
        },
        {
          "full_name": "Kim Kaufman",
          "role": "adult",
          "email": "kime@demo.com"
        },
        {
          "full_name": "Serena Muskat",
          "role": "child"
        },
        {
          "full_name": "Reed Muskat",
          "role": "child"
        }
      ],
      "display_name": "Muskat Family"
    }
  ],
  "cabins": [
    {
      "name": "Cabin 14",
      "map_slot_id": "cabin-a1"
    },
    {
      "name": "Cabin 15",
      "map_slot_id": "cabin-a2"
    },
    {
      "name": "Cabin 16",
      "map_slot_id": "cabin-a3"
    }
  ],
  "activities": [
    {
      "name": "Arrival",
      "area": "Guest Services",
      "setting": "inside",
      "map_place_id": "office"
    },
    {
      "name": "Waterfront & Activities Open (Waterski Sign-Up)",
      "area": "Waterfront",
      "setting": "outside",
      "map_place_id": "waterfront"
    },
    {
      "name": "Mostest!",
      "area": "General Events",
      "setting": "outside",
      "map_place_id": "field"
    },
    {
      "name": "Campfire & S'mores",
      "area": "General Events",
      "setting": "outside",
      "map_place_id": "camp-fire"
    },
    {
      "name": "Drop-In Gymnastics",
      "area": "Athletics",
      "setting": "inside",
      "map_place_id": "gymnastics"
    },
    {
      "name": "Pickleball Tournament",
      "area": "Athletics",
      "setting": "outside",
      "map_place_id": "tennis"
    },
    {
      "name": "Carnival in Junior Camp with Slip N Slide",
      "area": "General Events",
      "setting": "outside",
      "map_place_id": "field"
    },
    {
      "name": "Activities Open",
      "area": "General Events",
      "setting": "outside",
      "map_place_id": "field"
    },
    {
      "name": "Beach Luau & Night Blobbing",
      "area": "Waterfront",
      "setting": "outside",
      "map_place_id": "waterfront"
    },
    {
      "name": "Bonfire on the Beach",
      "area": "Waterfront",
      "setting": "outside",
      "map_place_id": "waterfront"
    },
    {
      "name": "Rest Hour",
      "area": "Lodging / Cabins",
      "setting": "inside",
      "map_place_id": "your-cabin"
    },
    {
      "name": "Color War!",
      "area": "Athletics",
      "setting": "outside",
      "map_place_id": "field"
    },
    {
      "name": "Watermelon Eating Contest",
      "area": "General Events",
      "setting": "outside",
      "map_place_id": "field"
    },
    {
      "name": "Activities Open (Waterski / Tubing Sign-Up)",
      "area": "Waterfront",
      "setting": "outside",
      "map_place_id": "waterfront"
    },
    {
      "name": "Adult Only Campfire",
      "area": "General Events",
      "setting": "outside",
      "map_place_id": "camp-fire"
    },
    {
      "name": "Waterfront Open",
      "area": "Waterfront",
      "setting": "outside",
      "map_place_id": "waterfront"
    },
    {
      "name": "Departure",
      "area": "Guest Services",
      "setting": "inside",
      "map_place_id": "office"
    }
  ],
  "schedule": [
    {
      "activity": "Arrival",
      "starts_at": "2026-08-19T11:00:00-04:00",
      "ends_at": "2026-08-19T11:30:00-04:00",
      "staff": [
        "alex"
      ]
    },
    {
      "activity": "Waterfront & Activities Open (Waterski Sign-Up)",
      "starts_at": "2026-08-19T14:00:00-04:00",
      "ends_at": "2026-08-19T17:00:00-04:00",
      "staff": [
        "alex",
        "quinn"
      ]
    },
    {
      "activity": "Mostest!",
      "starts_at": "2026-08-19T19:30:00-04:00",
      "ends_at": "2026-08-19T20:30:00-04:00",
      "staff": [
        "alex"
      ]
    },
    {
      "activity": "Campfire & S'mores",
      "starts_at": "2026-08-19T20:30:00-04:00",
      "ends_at": "2026-08-19T21:30:00-04:00",
      "staff": [
        "alex"
      ]
    },
    {
      "activity": "Drop-In Gymnastics",
      "starts_at": "2026-08-20T09:00:00-04:00",
      "ends_at": "2026-08-20T12:00:00-04:00",
      "staff": [
        "alex"
      ]
    },
    {
      "activity": "Pickleball Tournament",
      "starts_at": "2026-08-20T09:00:00-04:00",
      "ends_at": "2026-08-20T12:00:00-04:00",
      "staff": [
        "quinn"
      ]
    },
    {
      "activity": "Activities Open",
      "starts_at": "2026-08-20T09:00:00-04:00",
      "ends_at": "2026-08-20T12:00:00-04:00",
      "staff": [
        "lu"
      ]
    },
    {
      "activity": "Rest Hour",
      "starts_at": "2026-08-20T13:00:00-04:00",
      "ends_at": "2026-08-20T14:00:00-04:00",
      "staff": [
        "quinn"
      ]
    },
    {
      "activity": "Carnival in Junior Camp with Slip N Slide",
      "starts_at": "2026-08-20T14:00:00-04:00",
      "ends_at": "2026-08-20T15:00:00-04:00",
      "staff": [
        "alex"
      ]
    },
    {
      "activity": "Activities Open",
      "starts_at": "2026-08-20T15:00:00-04:00",
      "ends_at": "2026-08-20T17:00:00-04:00",
      "staff": [
        "alex"
      ]
    },
    {
      "activity": "Beach Luau & Night Blobbing",
      "starts_at": "2026-08-20T19:30:00-04:00",
      "ends_at": "2026-08-20T21:00:00-04:00",
      "staff": [
        "alex",
        "quinn"
      ]
    },
    {
      "activity": "Bonfire on the Beach",
      "starts_at": "2026-08-20T21:00:00-04:00",
      "ends_at": "2026-08-20T22:00:00-04:00",
      "staff": [
        "alex",
        "quinn"
      ]
    },
    {
      "activity": "Color War!",
      "starts_at": "2026-08-21T09:00:00-04:00",
      "ends_at": "2026-08-21T12:00:00-04:00",
      "staff": [
        "alex",
        "quinn"
      ]
    },
    {
      "activity": "Rest Hour",
      "starts_at": "2026-08-21T13:00:00-04:00",
      "ends_at": "2026-08-21T14:00:00-04:00",
      "staff": [
        "quinn"
      ]
    },
    {
      "activity": "Watermelon Eating Contest",
      "starts_at": "2026-08-21T14:00:00-04:00",
      "ends_at": "2026-08-21T15:00:00-04:00",
      "staff": [
        "alex"
      ]
    },
    {
      "activity": "Activities Open (Waterski / Tubing Sign-Up)",
      "starts_at": "2026-08-21T15:00:00-04:00",
      "ends_at": "2026-08-21T17:00:00-04:00",
      "staff": [
        "alex",
        "quinn"
      ]
    },
    {
      "activity": "Adult Only Campfire",
      "starts_at": "2026-08-21T20:00:00-04:00",
      "ends_at": "2026-08-21T23:00:00-04:00",
      "staff": [
        "alex"
      ]
    },
    {
      "activity": "Waterfront Open",
      "starts_at": "2026-08-22T08:00:00-04:00",
      "ends_at": "2026-08-22T10:00:00-04:00",
      "staff": [
        "alex",
        "quinn"
      ]
    },
    {
      "activity": "Departure",
      "starts_at": "2026-08-22T11:00:00-04:00",
      "ends_at": "2026-08-22T11:15:00-04:00",
      "staff": [
        "alex"
      ]
    }
  ],
  "after_hours_food": [
    {
      "name": "Grilled cheese",
      "description": "Classic toasted sandwich"
    },
    {
      "name": "Turkey sandwich",
      "description": "Turkey on sliced bread"
    },
    {
      "name": "Fruit cup",
      "description": "Fresh cut fruit"
    },
    {
      "name": "Cookies",
      "description": "Two cookies"
    }
  ],
  "meals": [
    {
      "meal_type": "Lunch",
      "menu": "Family Camp Menu",
      "starts_at": "2026-08-19T12:00:00-04:00",
      "ends_at": "2026-08-19T13:00:00-04:00",
      "title": "Lunch"
    },
    {
      "meal_type": "Dinner",
      "menu": "Family Camp Menu",
      "starts_at": "2026-08-19T18:00:00-04:00",
      "ends_at": "2026-08-19T19:00:00-04:00",
      "title": "Dinner"
    },
    {
      "meal_type": "Breakfast",
      "menu": "Family Camp Menu",
      "starts_at": "2026-08-20T07:30:00-04:00",
      "ends_at": "2026-08-20T09:00:00-04:00",
      "title": "Breakfast"
    },
    {
      "meal_type": "Lunch",
      "menu": "Family Camp Menu",
      "starts_at": "2026-08-20T12:00:00-04:00",
      "ends_at": "2026-08-20T13:00:00-04:00",
      "title": "Lunch"
    },
    {
      "meal_type": "Dinner",
      "menu": "Family Camp Menu",
      "starts_at": "2026-08-20T18:00:00-04:00",
      "ends_at": "2026-08-20T19:00:00-04:00",
      "title": "Dinner"
    },
    {
      "meal_type": "Breakfast",
      "menu": "Family Camp Menu",
      "starts_at": "2026-08-21T07:30:00-04:00",
      "ends_at": "2026-08-21T09:00:00-04:00",
      "title": "Breakfast"
    },
    {
      "meal_type": "Lunch",
      "menu": "Family Camp Menu",
      "starts_at": "2026-08-21T12:00:00-04:00",
      "ends_at": "2026-08-21T13:00:00-04:00",
      "title": "Lunch"
    },
    {
      "meal_type": "Dinner",
      "menu": "Family Camp Menu",
      "title": "Banquet",
      "starts_at": "2026-08-21T18:00:00-04:00",
      "ends_at": "2026-08-21T19:30:00-04:00"
    },
    {
      "meal_type": "Breakfast",
      "menu": "Family Camp Menu",
      "starts_at": "2026-08-22T07:30:00-04:00",
      "ends_at": "2026-08-22T09:00:00-04:00",
      "title": "Breakfast"
    }
  ],
  "activity_signups": [
    {
      "person": "Demi Dicker",
      "activity": "Waterfront & Activities Open (Waterski Sign-Up)"
    },
    {
      "person": "Dorrie Dicker",
      "activity": "Waterfront & Activities Open (Waterski Sign-Up)"
    },
    {
      "person": "Josh Dicker",
      "activity": "Color War!"
    }
  ],
  "babysitting": [
    {
      "household": "dicker",
      "member": "Demi Dicker",
      "staff": "quinn",
      "starts_at": "2026-08-21T20:00:00-04:00",
      "ends_at": "2026-08-21T23:00:00-04:00",
      "status": "confirmed",
      "notes": "Adult Only Campfire coverage"
    }
  ],
  "notifications": [
    {
      "targets": [
        "dicker",
        "muskat"
      ],
      "kind": "general",
      "title": "Family Camp is ready",
      "body": "Your Family Camp weekend schedule is available."
    }
  ]
} as const;

const FAMILY_CAMP_BASE_DATE = "2026-08-19";
const FAMILY_CAMP_TIME_ZONE = "America/New_York";

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function datePartsInZone(
  date: Date,
  timeZone: string,
): DateParts {
  const parts =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

  const value = (type: string) =>
    Number(
      parts.find(
        (part) => part.type === type,
      )?.value,
    );

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
  };
}

function addDays(
  date: DateParts,
  days: number,
): DateParts {
  const shifted = new Date(
    Date.UTC(
      date.year,
      date.month - 1,
      date.day + days,
    ),
  );

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function zonedDateTimeParts(
  date: Date,
  timeZone: string,
) {
  const parts =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);

  const value = (type: string) =>
    Number(
      parts.find(
        (part) => part.type === type,
      )?.value,
    );

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function zoneOffsetMilliseconds(
  date: Date,
  timeZone: string,
) {
  const parts =
    zonedDateTimeParts(
      date,
      timeZone,
    );

  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return (
    localAsUtc -
    Math.floor(date.getTime() / 1000) * 1000
  );
}

function localDateTimeToIso(
  date: DateParts,
  time: string,
) {
  const [hour, minute, second] =
    time.split(":").map(Number);

  const nominalUtc = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    hour,
    minute,
    second,
  );

  const firstGuess =
    new Date(nominalUtc);
  const firstOffset =
    zoneOffsetMilliseconds(
      firstGuess,
      FAMILY_CAMP_TIME_ZONE,
    );

  let actual = new Date(
    nominalUtc - firstOffset,
  );

  const correctedOffset =
    zoneOffsetMilliseconds(
      actual,
      FAMILY_CAMP_TIME_ZONE,
    );

  if (correctedOffset !== firstOffset) {
    actual = new Date(
      nominalUtc - correctedOffset,
    );
  }

  return actual.toISOString();
}

function shiftTimestamp(
  timestamp: string,
  launchDate: DateParts,
) {
  const match = timestamp.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}:\d{2})(?:Z|[+-]\d{2}:\d{2})$/,
  );

  if (!match) {
    return timestamp;
  }

  const [, year, month, day, time] =
    match;

  const base = FAMILY_CAMP_BASE_DATE
    .split("-")
    .map(Number);

  const dayOffset = Math.round(
    (
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
      ) -
      Date.UTC(
        base[0],
        base[1] - 1,
        base[2],
      )
    ) /
      86_400_000,
  );

  return localDateTimeToIso(
    addDays(
      launchDate,
      dayOffset,
    ),
    time,
  );
}

function shiftSeedDates<T>(
  value: T,
  launchDate: DateParts,
): T {
  if (typeof value === "string") {
    return shiftTimestamp(
      value,
      launchDate,
    ) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      shiftSeedDates(
        item,
        launchDate,
      ),
    ) as unknown as T;
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.entries(value).map(
        ([key, item]) => [
          key,
          shiftSeedDates(
            item,
            launchDate,
          ),
        ],
      ),
    ) as unknown as T;
  }

  return value;
}

export function createFamilyCampSeed(
  now = new Date(),
) {
  const launchDate = datePartsInZone(
    now,
    FAMILY_CAMP_TIME_ZONE,
  );

  return shiftSeedDates(
    familyCampSeedTemplate,
    launchDate,
  );
}
