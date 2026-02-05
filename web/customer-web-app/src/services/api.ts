import axios from "axios";
import { getCookie, deleteCookie } from "cookies-next";

// Use environment variable or fallback to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 20000,
});

// Request Interceptor: Inject Token
api.interceptors.request.use(
  (config) => {
    const token = getCookie("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Handle 401 Session Expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      deleteCookie("accessToken");
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/sign-in")
      ) {
        window.location.href = "/sign-in?reason=session_expired";
      }
    }
    return Promise.reject(error);
  },
);
