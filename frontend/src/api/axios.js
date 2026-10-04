import axios from "axios";

const axiosInstance = axios.create({
  // baseURL: "http://localhost:8016/api", // backend ka port
  baseURL: "https://portal.stackworksflow.com/api", // backe   nd ka port
  withCredentials: true,
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("frontend_token");
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