import axiosInstance from "./axios";

export const createUmrahBooking = async (formData) => {
  const response = await axiosInstance.post("/umrah-package-bookings/create", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getMyUmrahBookings = async () => {
  const response = await axiosInstance.get("/umrah-package-bookings/my");
  return response.data;
};

export const getUmrahBookingById = async (id) => {
  const response = await axiosInstance.get(`/umrah-package-bookings/${id}`);
  return response.data;
};
