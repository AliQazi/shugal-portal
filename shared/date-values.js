export function toISODate(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
  return `${String(value.getFullYear()).padStart(4, "0")}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function displayDate(value) {
  const iso = toISODate(value);
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "";
}

export function maskDate(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length <= 2 ? digits : digits.length <= 4 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseDate(value) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null;
  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function dateError(value, min, max) {
  if (!value) return "";
  const date = parseDate(value);
  if (!date) return "Enter a valid date in DD/MM/YYYY format.";
  const iso = toISODate(date);
  if (min && iso < min) return `Choose a date on or after ${displayDate(min)}.`;
  if (max && iso > max) return `Choose a date on or before ${displayDate(max)}.`;
  return "";
}
