import axiosInstance from "./axios";

export interface UmrahPassenger {
  type: string;
  title: string;
  givenName: string;
  surName: string;
  passport: string;
  dateOfBirth: string;
  passportExpiry: string;
  nationality: string;
  passportFileUrl?: string;
}

export interface UmrahBooking {
  _id: string;
  bookingNumber: string;
  user?: { _id: string; name: string; email: string; phone?: string };
  packageName: string;
  packageSource: string;
  roomType: string;
  passengers: UmrahPassenger[];
  specialRequests?: string;
  pricing: { pricePerPerson: number; currency: string; totalAmount: number };
  status: "pending" | "confirmed" | "cancelled" | "completed";
  adminNote?: string;
  createdAt: string;
  packageData?: Record<string, unknown>;
}

export interface AdminBookingsResponse {
  success: boolean;
  data: UmrahBooking[];
  total: number;
  page: number;
  pages: number;
}

export const adminGetAllUmrahBookings = (
  page = 1,
  status?: string
): Promise<{ data: AdminBookingsResponse }> => {
  const params: Record<string, string | number> = { page, limit: 20 };
  if (status) params.status = status;
  return axiosInstance.get("/umrah-package-bookings/admin/all", { params });
};

export const adminUpdateUmrahBookingStatus = (
  id: string,
  status: string,
  adminNote?: string
) =>
  axiosInstance.patch(`/umrah-package-bookings/admin/${id}/status`, {
    status,
    adminNote,
  });
