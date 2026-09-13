"use client";

import { useEffect, useState } from "react";

type DateInputProps = {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  min?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

function formatDate(value: string) {
  if (!value) return "";

  const parts = value.split("-");
  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function parseDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length !== 8) return null;

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));

  if (
    year < 1900 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export default function DateInput({
  value,
  onChange,
  min,
  disabled,
  className = "",
  placeholder = "DD/MM/YYYY",
}: DateInputProps) {
  const [text, setText] = useState(formatDate(value));

  useEffect(() => {
    setText(formatDate(value));
  }, [value]);

  function handleChange(nextText: string) {
    const cleaned = nextText.replace(/[^\d/]/g, "").slice(0, 10);

    setText(cleaned);

    const iso = parseDate(cleaned);

    if (!iso) {
      if (cleaned === "") {
        onChange({ target: { value: "" } });
      }
      return;
    }

    if (min && iso < min) {
      return;
    }

    onChange({ target: { value: iso } });
  }

  function handleBlur() {
    if (!text) return;

    const iso = parseDate(text);

    if (!iso || (min && iso < min)) {
      setText(formatDate(value));
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={placeholder}
      maxLength={10}
      className={className}
    />
  );
}
