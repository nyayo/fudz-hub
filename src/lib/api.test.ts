import axios, { type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

const response = (config: InternalAxiosRequestConfig, data = {}) => ({ data, status: 200, statusText: "OK", headers: {}, config });

beforeEach(() => { vi.resetModules(); localStorage.clear(); });

describe("browser session isolation", () => {
  it("exchanges refresh credentials with explicit authorization and keeps credentials out of storage", async () => {
    const { establishBrowserSession, tokenStorage } = await import("./api");
    const calls: InternalAxiosRequestConfig[] = [];
    axios.defaults.adapter = (async (config) => { calls.push(config); return response(config); }) as AxiosAdapter;
    await establishBrowserSession("access-a", "refresh-a");
    expect(calls[0].headers.Authorization).toBe("Bearer access-a");
    expect(calls[0].withCredentials).toBe(true);
    expect(tokenStorage.getAccess()).toBe("access-a");
    expect(localStorage.length).toBe(0);
  });

  it("drains a pending refresh before revoking logout and never restores its credentials", async () => {
    const { restoreBrowserSession, endBrowserSession, tokenStorage } = await import("./api");
    let complete!: () => void;
    const calls: string[] = [];
    axios.defaults.adapter = (async (config) => {
      calls.push(config.url!);
      if (config.url!.endsWith("/refresh/")) return new Promise(resolve => {
        complete = () => resolve(response(config, { access: "stale-session-access" }));
      });
      return response(config);
    }) as AxiosAdapter;
    tokenStorage.set("old-access");
    const refresh = restoreBrowserSession().catch(() => null);
    await vi.waitFor(() => expect(complete).toBeTypeOf("function"));
    const detach = vi.fn(async () => "push-endpoint");
    const logout = endBrowserSession(detach);
    expect(calls.some(url => url.endsWith("/logout/"))).toBe(false);
    complete();
    await Promise.all([refresh, logout]);
    expect(tokenStorage.getAccess()).toBeNull();
    expect(calls.at(-1)).toMatch(/\/browser\/logout\/$/);
    expect(detach).toHaveBeenCalledOnce();
  });

  it("revokes the browser cookie even if push cleanup fails", async () => {
    const { endBrowserSession } = await import("./api");
    const calls: InternalAxiosRequestConfig[] = [];
    axios.defaults.adapter = (async config => { calls.push(config); return response(config); }) as AxiosAdapter;
    await endBrowserSession(async () => { throw new Error("Push unavailable"); });
    expect(calls[0].url).toMatch(/\/browser\/logout\/$/);
    expect(calls[0].withCredentials).toBe(true);
  });

  it("discards a private response that completes after the session changes", async () => {
    const { api, tokenStorage } = await import("./api");
    let complete!: () => void;
    api.defaults.adapter = (async config => new Promise(resolve => {
      complete = () => resolve(response(config, { private: "account-a" }));
    })) as AxiosAdapter;
    tokenStorage.set("account-a");
    const request = api.get("/orders/orders/").catch(error => error);
    await vi.waitFor(() => expect(complete).toBeTypeOf("function"));
    tokenStorage.clear();
    tokenStorage.set("account-b");
    complete();
    expect(axios.isCancel(await request)).toBe(true);
  });
});
