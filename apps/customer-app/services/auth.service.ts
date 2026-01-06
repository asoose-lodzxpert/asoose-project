const DEFAULT_BACKEND = "https://asoose.com/api/v1/";

const BACKEND_URL =
  (process.env.BACKEND_URL || DEFAULT_BACKEND).replace(/\/+$/, "") + "/";

const AUTH_BASE = `${BACKEND_URL}auth/user/`;

type SignupPayload = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

async function requestJson(path: string, opts: RequestInit = {}) {
  const url = AUTH_BASE + path;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const text = await res.text();
  try {
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) throw json || new Error(`HTTP ${res.status}`);
    return json;
  } catch (err) {
    // non-json error
    if (!res.ok) throw err;
    return null;
  }
}

export async function signup(payload: SignupPayload) {
  return requestJson("signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(email: string, password: string) {
  return requestJson("login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function refreshToken(refresh: string) {
  return requestJson("refresh", {
    method: "POST",
    body: JSON.stringify({ refresh }),
  });
}

export async function logout() {
  return requestJson("logout", { method: "POST" });
}

export const authConfig = {
  backendUrl: BACKEND_URL,
  authBase: AUTH_BASE,
};

export default { signup, login, authConfig };
