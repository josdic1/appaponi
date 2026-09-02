type ParsedHumanDateTime = {
  date: Date;
  explicitDate: boolean;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseTime(raw: string) {
  const value = raw
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "");

  const match = value.match(
    /^(\d{1,2})(?::?(\d{2}))?(a|am|p|pm)?$/,
  );

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = match[2]
    ? Number(match[2])
    : 0;
  const meridiem = match[3] ?? "";

  if (minute > 59) {
    return null;
  }

  if (meridiem) {
    if (hour < 1 || hour > 12) {
      return null;
    }

    if (meridiem.startsWith("p") && hour !== 12) {
      hour += 12;
    }

    if (meridiem.startsWith("a") && hour === 12) {
      hour = 0;
    }
  } else if (hour > 23) {
    return null;
  }

  return { hour, minute };
}

function validDate(
  year: number,
  month: number,
  day: number,
) {
  const date = new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
    0,
  );

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function baseDateFrom(
  value?: string,
): Date {
  if (!value) {
    return new Date();
  }

  const explicit = value.match(
    /^\s*(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/,
  );

  if (explicit) {
    let year = explicit[3]
      ? Number(explicit[3])
      : new Date().getFullYear();

    if (year < 100) {
      year += 2000;
    }

    const month = Number(explicit[1]);
    const day = Number(explicit[2]);

    if (validDate(year, month, day)) {
      return new Date(
        year,
        month - 1,
        day,
        12,
        0,
        0,
        0,
      );
    }
  }

  const iso = new Date(value);

  if (!Number.isNaN(iso.getTime())) {
    return iso;
  }

  return new Date();
}

export function parseHumanDateTime(
  input: string,
  defaultDate?: string,
): ParsedHumanDateTime {
  const source = input.trim();

  if (!source) {
    throw new Error(
      "Enter a date and time.",
    );
  }

  const lower = source.toLowerCase();
  const todayMatch = lower.match(
    /^(today|tomorrow)\s+(.+)$/,
  );

  if (todayMatch) {
    const base = new Date();

    if (todayMatch[1] === "tomorrow") {
      base.setDate(base.getDate() + 1);
    }

    const time = parseTime(todayMatch[2]);

    if (!time) {
      throw new Error(
        "Use a time like 11a, 230p, or 14:30.",
      );
    }

    base.setHours(
      time.hour,
      time.minute,
      0,
      0,
    );

    return {
      date: base,
      explicitDate: true,
    };
  }

  const isoDateMatch = source.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(.+)$/,
  );

  if (isoDateMatch) {
    const year = Number(isoDateMatch[1]);
    const month = Number(isoDateMatch[2]);
    const day = Number(isoDateMatch[3]);
    const time = parseTime(isoDateMatch[4]);

    if (
      !time ||
      !validDate(year, month, day)
    ) {
      throw new Error(
        "Use a date/time like 9/5 7p.",
      );
    }

    return {
      date: new Date(
        year,
        month - 1,
        day,
        time.hour,
        time.minute,
        0,
        0,
      ),
      explicitDate: true,
    };
  }

  const dateMatch = source.match(
    /^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\s+(.+)$/,
  );

  if (dateMatch) {
    const fallback =
      baseDateFrom(defaultDate);
    let year = dateMatch[3]
      ? Number(dateMatch[3])
      : fallback.getFullYear();

    if (year < 100) {
      year += 2000;
    }

    const month = Number(dateMatch[1]);
    const day = Number(dateMatch[2]);
    const time = parseTime(dateMatch[4]);

    if (
      !time ||
      !validDate(year, month, day)
    ) {
      throw new Error(
        "Use a date/time like 9/5 7p.",
      );
    }

    return {
      date: new Date(
        year,
        month - 1,
        day,
        time.hour,
        time.minute,
        0,
        0,
      ),
      explicitDate: true,
    };
  }

  const time = parseTime(source);

  if (!time) {
    throw new Error(
      "Use 11a, 230p, 14:30, or 9/5 7p.",
    );
  }

  const base = baseDateFrom(defaultDate);
  base.setHours(
    time.hour,
    time.minute,
    0,
    0,
  );

  return {
    date: base,
    explicitDate: false,
  };
}

function humanTime(date: Date) {
  let hour = date.getHours();
  const minute = date.getMinutes();
  const meridiem = hour >= 12
    ? "PM"
    : "AM";

  hour %= 12;

  if (hour === 0) {
    hour = 12;
  }

  return `${hour}:${pad(minute)} ${meridiem}`;
}

export function normalizeHumanDateTime(
  input: string,
  defaultDate?: string,
) {
  const parsed = parseHumanDateTime(
    input,
    defaultDate,
  );

  if (!parsed.explicitDate) {
    return humanTime(parsed.date);
  }

  return `${
    parsed.date.getMonth() + 1
  }/${parsed.date.getDate()}/${
    parsed.date.getFullYear()
  } ${humanTime(parsed.date)}`;
}

export function humanDateTimeToIso(
  input: string,
  defaultDate?: string,
) {
  return parseHumanDateTime(
    input,
    defaultDate,
  ).date.toISOString();
}
