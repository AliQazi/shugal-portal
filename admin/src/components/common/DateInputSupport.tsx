import { useEffect } from "react";
import flatpickr from "flatpickr";
import { installDateCalendarSupport } from "../../../../shared/date-calendar";
import "flatpickr/dist/flatpickr.css";
import "./date-input-support.css";

export default function DateInputSupport() {
  useEffect(() => installDateCalendarSupport(flatpickr), []);
  return null;
}
