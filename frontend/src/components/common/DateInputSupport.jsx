import { useEffect } from "react";
import flatpickr from "flatpickr";
import { installDateCalendarSupport } from "../../../../shared/date-calendar";
import "flatpickr/dist/flatpickr.css";
import "../../../../shared/date-calendar.css";

export default function DateInputSupport() {
  useEffect(() => installDateCalendarSupport(flatpickr), []);
  return null;
}
