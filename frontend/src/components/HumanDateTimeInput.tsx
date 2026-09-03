import {
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import {
  normalizeHumanDateTime,
} from "../lib/humanDateTime";

type Props = {
  value: string;
  onChange: (value: string) => void;
  defaultDate?: string;
  placeholder?: string;
  disabled?: boolean;
};

function timePart(
  value: string,
) {
  const source = value.trim();

  if (!source) {
    return "";
  }

  const dated = source.match(
    /^(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)\s+(.+)$/,
  );

  if (dated) {
    return dated[1].trim();
  }

  const relative = source.match(
    /^(?:today|tomorrow)\s+(.+)$/i,
  );

  if (relative) {
    return relative[1].trim();
  }

  return source;
}

export default function HumanDateTimeInput({
  value,
  onChange,
  defaultDate,
  placeholder = "9/5 7p or 11a",
  disabled = false,
}: Props) {
  const [invalid, setInvalid] =
    useState(false);

  const textInputRef =
    useRef<HTMLInputElement>(
      null,
    );

  function handleChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setInvalid(false);
    onChange(event.target.value);
  }

  function normalize() {
    if (!value.trim()) {
      setInvalid(false);
      return;
    }

    try {
      onChange(
        normalizeHumanDateTime(
          value,
          defaultDate,
        ),
      );
      setInvalid(false);
    } catch {
      setInvalid(true);
    }
  }

  function handleDatePick(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const picked =
      event.target.value;

    if (!picked) {
      return;
    }

    const [
      year,
      month,
      day,
    ] = picked
      .split("-")
      .map(Number);

    const dateText =
      `${month}/${day}/${year}`;

    const existingTime =
      timePart(value);

    const nextValue =
      existingTime
        ? `${dateText} ${existingTime}`
        : `${dateText} `;

    if (existingTime) {
      try {
        onChange(
          normalizeHumanDateTime(
            nextValue,
            defaultDate,
          ),
        );
        setInvalid(false);
      } catch {
        onChange(nextValue);
        setInvalid(false);
      }
    } else {
      onChange(nextValue);
      setInvalid(false);
    }

    event.target.value = "";

    requestAnimationFrame(() => {
      const input =
        textInputRef.current;

      if (!input) {
        return;
      }

      input.focus();

      const end =
        input.value.length;

      input.setSelectionRange(
        end,
        end,
      );
    });
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    normalize();
  }

  return (
    <span className="appoponi-datetime">
      <span className="appoponi-datetime-control">
        <input
          ref={textInputRef}
          className={
            invalid
              ? "appoponi-datetime-input invalid"
              : "appoponi-datetime-input"
          }
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={invalid}
          onChange={handleChange}
          onBlur={normalize}
          onKeyDown={handleKeyDown}
        />

        <span
          className="appoponi-datetime-calendar"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 3v3M17 3v3M4 9h16" />
            <rect
              x="4"
              y="5"
              width="16"
              height="16"
              rx="2"
            />
          </svg>

          <input
            className="appoponi-datetime-date-picker"
            type="date"
            aria-label="Choose date"
            disabled={disabled}
            onChange={handleDatePick}
          />
        </span>
      </span>

      {invalid && (
        <small className="appoponi-datetime-hint">
          Try 11a, 230p, or 9/5 7p.
        </small>
      )}
    </span>
  );
}
