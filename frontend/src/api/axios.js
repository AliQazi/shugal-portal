import axios from "axios";

const axiosInstance = axios.create({
  // baseURL: "http://localhost:8007/api", // backend ka port
  baseURL: "https://shaheenwingstravels.com/api", // backend ka port
  withCredentials: true,
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("frontend_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default axiosInstance;
