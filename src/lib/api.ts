import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL = "https://www.unshifter.site/api/v1";

const ACCESS_KEY = "fudz_access_token";
const REFRESH_KEY = "fudz_refresh_token";

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh?: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

const REFRESH_SKEW_SECONDS = 45;
type RefreshResponse = { access?: string; refresh?: string };
type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

function tokenExpiry(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))) as { exp?: unknown };
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
}

function expiresWithin(token: string | null, seconds: number): boolean {
  const exp = tokenExpiry(token);
  return exp !== null && exp <= Math.floor(Date.now() / 1000) + seconds;
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await axios.post<RefreshResponse>(`${API_BASE_URL}/users/auth/token/refresh/`, { refresh });
    if (typeof data.access !== "string" || !data.access) throw new Error("Refresh response did not include an access token.");
    tokenStorage.set(data.access, data.refresh ?? refresh);
    return data.access;
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    // Retain credentials on network/server errors; clear only a rejected refresh token.
    if (status === 400 || status === 401 || status === 403) tokenStorage.clear();
    throw error;
  }
}

let refreshing: Promise<string | null> | null = null;
function getFreshAccessToken(force = false): Promise<string | null> {
  const current = tokenStorage.getAccess();
  if (!force && current && !expiresWithin(current, REFRESH_SKEW_SECONDS)) return Promise.resolve(current);
  if (!refreshing) refreshing = refreshAccessToken().finally(() => { refreshing = null; });
  return refreshing;
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  let token = tokenStorage.getAccess();
  if (token && expiresWithin(token, REFRESH_SKEW_SECONDS) && tokenStorage.getRefresh()) {
    try {
      token = await getFreshAccessToken();
    } catch {
      // A transient refresh outage should not force a sign-out or erase credentials.
      token = tokenStorage.getAccess();
    }
  }
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function tokenFromConfig(config: RetriableConfig): string | null {
  const header = config.headers?.Authorization;
  if (typeof header === "string") return header.replace(/^Bearer\s+/i, "");
  return tokenStorage.getAccess();
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const sentToken = original ? tokenFromConfig(original) : null;
    const status = error.response?.status;
    const expiredAccess403 = status === 403 && expiresWithin(sentToken, 0);
    const shouldRefresh = status === 401 || expiredAccess403;

    // A 403 from a still-valid token is a genuine permission denial and is not retried.
    if (!original || !shouldRefresh || original._retry) return Promise.reject(error);
    if (!tokenStorage.getRefresh()) {
      window.dispatchEvent(new Event("fudz:logout"));
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      const latest = tokenStorage.getAccess();
      const fresh = latest && latest !== sentToken && !expiresWithin(latest, 0)
        ? latest
        : await getFreshAccessToken(true);
      if (fresh && original.headers) {
        original.headers.Authorization = `Bearer ${fresh}`;
        return api(original);
      }
      if (!tokenStorage.getRefresh()) window.dispatchEvent(new Event("fudz:logout"));
    } catch {
      // Do not sign the user out for a temporary refresh-service/network failure.
      if (!tokenStorage.getRefresh()) window.dispatchEvent(new Event("fudz:logout"));
    }
    return Promise.reject(error);
  },
);

export function extractApiError(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Record<string, unknown> | undefined;
    if (data) {
      if (typeof data.detail === "string") return data.detail;
      if (typeof data.message === "string") return data.message;
      const firstField = Object.values(data)[0];
      if (Array.isArray(firstField) && typeof firstField[0] === "string") return firstField[0];
      if (typeof firstField === "string") return firstField;
    }
    return err.message || fallback;
  }
  return fallback;
}
