import { useState } from "react";
import { BookingSelectionContext } from "./BookingSelectionContext";
import { toBookingSelection } from "../utils/bookingSelection";

const STORAGE_KEY = "selected_group_booking";

const readSelectedGroup = (userKey) => {
  if (!userKey) return null;

  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.userKey !== userKey) return null;
    const selection = toBookingSelection(saved.group);
    if (selection) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ userKey, group: selection }));
    }
    return selection;
  } catch {
    return null;
  }
};

export function BookingSelectionProvider({ userKey, children }) {
  const [selectedGroup, setSelectedGroupState] = useState(() => readSelectedGroup(userKey));

  const setSelectedGroup = (group) => {
    const selection = toBookingSelection(group);
    setSelectedGroupState(selection);
    try {
      if (selection && userKey) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ userKey, group: selection }));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // The context still carries the selection if browser storage is unavailable.
    }
  };

  return (
    <BookingSelectionContext.Provider value={{ selectedGroup, setSelectedGroup }}>
      {children}
    </BookingSelectionContext.Provider>
  );
}
