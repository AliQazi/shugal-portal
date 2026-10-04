import { createContext, useContext } from "react";

export const BookingSelectionContext = createContext(null);

export function useBookingSelection() {
  const context = useContext(BookingSelectionContext);
  if (!context) {
    throw new Error("useBookingSelection must be used within BookingSelectionProvider");
  }
  return context;
}
