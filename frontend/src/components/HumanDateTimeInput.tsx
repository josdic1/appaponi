import {
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

export default function HumanDateTimeInput({
  value,
  onChange,
  defaultDate,
  placeholder = "9/5 7p or 11a",
  disabled = false,
}: Props) {
  const [invalid, setInvalid] =
    useState(false);

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
      <input
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

      {invalid && (
        <small className="appoponi-datetime-hint">
          Try 11a, 230p, or 9/5 7p.
        </small>
      )}
    </span>
  );
}
