"use client";

import { useEffect, useRef, useState } from "react";

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

  if (digits.length != 8) return null;

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));

  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
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
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(formatDate(value));
  }, [value]);

  function handleTextChange(nextText: string) {
    const cleaned = nextText.replace(/[^\d/]/g, "").slice(0, 10);
    setText(cleaned);

    const iso = parseDate(cleaned);

    if (!iso) {
      if (cleaned === "") {
        onChange({ target: { value: "" } });
      }
      return;
    }

    if (min && iso < min) return;

    onChange({ target: { value: iso } });
  }

  function handleBlur() {
    if (!text) return;

    const iso = parseDate(text);

    if (!iso || (min && iso < min)) {
      setText(formatDate(value));
    }
  }

  function openPicker() {
    if (disabled) return;

    const picker = pickerRef.current;

    if (!picker) return;

    if (typeof picker.showPicker === "function") {
      picker.showPicker();
    } else {
      picker.click();
    }
  }

  function handlePickerChange(nextValue: string) {
    if (!nextValue) return;

    if (min && nextValue < min) return;

    setText(formatDate(nextValue));
    onChange({ target: { value: nextValue } });
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(event) => handleTextChange(event.target.value)}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={10}
        className={`${className} pr-12`}
      />

      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-label="Choose date"
        className="absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5"
        >
          <rect x="3" y="4.5" width="18" height="17" rx="2" />
          <path d="M16 2.5v4M8 2.5v4M3 9h18" />
        </svg>
      </button>

      <input
        ref={pickerRef}
        type="date"
        value={value || ""}
        min={min}
        onChange={(event) => handlePickerChange(event.target.value)}
        disabled={disabled}
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none absolute left-0 top-0 h-0 w-0 opacity-0"
      />
    </div>
  );
}
