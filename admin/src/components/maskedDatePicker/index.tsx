import { useEffect, useRef, useState } from "react";
import { dateError, displayDate, maskDate, parseDate, toISODate } from "../../../../shared/date-values";

interface MaskedDatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  size?: "big" | "small";
  minDate?: Date;
  maxDate?: Date;
  placeholderText?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

export default function MaskedDatePicker({ value, onChange, size = "big", minDate, maxDate, placeholderText = "DD/MM/YYYY", id, name, required = false, disabled = false, readOnly = false }: MaskedDatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const iso = toISODate(value), min = toISODate(minDate), max = toISODate(maxDate);
  const [draft, setDraft] = useState({ source: iso, raw: displayDate(value) });
  const displayed = draft.source === iso ? draft.raw : displayDate(value);
  useEffect(() => { inputRef.current?.setCustomValidity(dateError(displayed, min, max)); }, [displayed, min, max]);

  return <div className="calendar-date-wrapper"><input
    ref={inputRef} type="text" id={id} name={name} inputMode="numeric" autoComplete="off"
    data-calendar-date data-calendar-value={iso} data-calendar-format="d/m/Y" data-calendar-min={min} data-calendar-max={max}
    aria-label={placeholderText} placeholder={placeholderText} value={displayed} required={required} disabled={disabled} readOnly={readOnly}
    onChange={(event) => {
      const raw = maskDate(event.target.value), error = dateError(raw, min, max);
      setDraft({ source: iso, raw }); event.target.setCustomValidity(error);
      if (!error) onChange(raw ? parseDate(raw) : null);
    }}
    className={`w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${size === "big" ? "px-4 py-2 pr-10 rounded-md text-sm" : "px-2 py-1 rounded text-xs"}`}
  /></div>;
}
