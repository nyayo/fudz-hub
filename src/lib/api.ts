import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL = "https://www.unshifter.site/api/v1";

// Access credentials live only for this page's lifetime. Refresh credentials
// are HttpOnly cookies managed by the API, never JavaScript storage.
let accessToken: string | null = null;
let sessionActive = false;
let sessionEpoch = 0;
let refreshing: Promise<string | null> | null = null;
let endingSession: Promise<void> | null = null;

export const tokenStorage = {
  getAccess: () => accessToken,
  set: (access: string) => { accessToken = access; sessionActive = true; },
  clear: () => { accessToken = null; sessionActive = false; sessionEpoch += 1; },
};

export function clearLegacySession() {
  for (const key of ["fudz_access_token", "fudz_refresh_token", "fudz_user"]) localStorage.removeItem(key);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean; _sessionEpoch?: number };

function tokenExpiry(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))) as { exp?: unknown };
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch { return null; }
}

function expiresWithin(token: string | null, seconds: number): boolean {
  const exp = tokenExpiry(token);
  return exp !== null && exp <= Math.floor(Date.now() / 1000) + seconds;
}

export async function establishBrowserSession(access: string, refresh: string): Promise<void> {
  if (endingSession) await endingSession;
  // Drain old refresh responses before setting a new account's cookie.
  const previousRefresh = refreshing;
  tokenStorage.clear();
  if (previousRefresh) await previousRefresh.catch(() => undefined);
  await axios.post(`${API_BASE_URL}/users/auth/browser/session/`, { refresh }, {
    withCredentials: true, timeout: 15_000,
    headers: { Authorization: `Bearer ${access}` },
  });
  tokenStorage.set(access);
}

export function restoreBrowserSession(): Promise<string | null> {
  if (endingSession) return Promise.resolve(null);
  if (!refreshing) {
    const epoch = sessionEpoch;
    refreshing = axios.post<{ access: string }>(`${API_BASE_URL}/users/auth/browser/refresh/`, {}, { withCredentials: true, timeout: 15_000 })
      .then(({ data }) => {
        if (epoch !== sessionEpoch) throw new Error("Session changed during refresh.");
        if (typeof data.access !== "string" || !data.access) throw new Error("Invalid refresh response.");
        tokenStorage.set(data.access);
        return data.access;
      })
      .catch((error: unknown) => {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (epoch === sessionEpoch && (status === 400 || status === 401 || status === 403)) {
          tokenStorage.clear();
          window.dispatchEvent(new Event("fudz:logout"));
        }
        throw error;
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

export function endBrowserSession(detachPush: () => Promise<string | undefined>): Promise<void> {
  if (endingSession) return endingSession;
  const pendingRefresh = refreshing;
  tokenStorage.clear();
  clearLegacySession();
  endingSession = (async () => {
    // A delayed refresh can still set a cookie. Revoke/delete after it settles.
    if (pendingRefresh) await pendingRefresh.catch(() => undefined);
    let endpoint: string | undefined;
    try { endpoint = await detachPush(); } catch { /* Still revoke the session. */ }
    await axios.post(`${API_BASE_URL}/users/auth/browser/logout/`, { registration_id: endpoint }, { withCredentials: true, timeout: 15_000 });
  })().finally(() => { endingSession = null; });
  return endingSession;
}

api.interceptors.request.use(async (config: RetriableConfig) => {
  const epoch = sessionEpoch;
  config._sessionEpoch = epoch;
  let token = tokenStorage.getAccess();
  if (token && expiresWithin(token, 45)) {
    try { token = await restoreBrowserSession(); }
    catch { token = tokenStorage.getAccess(); }
  }
  if (epoch !== sessionEpoch) throw new axios.CanceledError("Session changed.");
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    if ((response.config as RetriableConfig)._sessionEpoch !== sessionEpoch) throw new axios.CanceledError("Session changed.");
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    if (!original || original._sessionEpoch !== sessionEpoch) return Promise.reject(error);
    const sentHeader = original.headers?.Authorization;
    const sentToken = typeof sentHeader === "string" ? sentHeader.replace(/^Bearer\s+/i, "") : null;
    const status = error.response?.status;
    const shouldRefresh = status === 401 || (status === 403 && expiresWithin(sentToken, 0));
    if (!shouldRefresh || original._retry || !sessionActive || !sentToken) return Promise.reject(error);
    original._retry = true;
    try {
      const latest = tokenStorage.getAccess();
      const fresh = latest && latest !== sentToken && !expiresWithin(latest, 0)
        ? latest : await restoreBrowserSession();
      if (original._sessionEpoch !== sessionEpoch) throw new axios.CanceledError("Session changed.");
      if (fresh && original.headers) {
        original.headers.Authorization = `Bearer ${fresh}`;
        return api(original);
      }
    } catch { /* Refresh errors already invalidate rejected sessions. */ }
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
