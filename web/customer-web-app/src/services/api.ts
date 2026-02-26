import axios from "axios";
import { getCookie, deleteCookie } from "cookies-next";

// Use environment variable or fallback to localhost
// Fallback MUST include /api/v1 to match NestJS global prefix + versioning (H1 fix)
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

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
      // Sign out via NextAuth to clear the JWT cookie. This prevents the
      // redirect loop: /main/* → 401 → /sign-in → middleware sees valid JWT
      // → redirect to /main/* → 401 → ...
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/sign-in")
      ) {
        import("next-auth/react").then(({ signOut }) => {
          signOut({ callbackUrl: "/sign-in?reason=session_expired" });
        });
      }
    }
    return Promise.reject(error);
  },
);
