import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("@/lib/api", () => ({
  tokenStorage: { set: vi.fn(), getAccess: vi.fn(() => null) },
  clearLegacySession: vi.fn(), restoreBrowserSession: vi.fn(async () => null),
  endBrowserSession: vi.fn(async () => undefined),
}));
vi.mock("@/services/authService", () => ({ getUserProfile: vi.fn() }));
vi.mock("@/services/webPushService", () => ({ detachBrowserPush: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

function Controls() {
  const { loginWithTokens, logout, isLoading } = useAuth();
  return <><span>{isLoading ? "loading" : "ready"}</span><button onClick={() => loginWithTokens({ email: "b@example.test" }, "b-access")}>login</button><button onClick={logout}>logout</button></>;
}

describe("private query cache", () => {
  it("clears private data on automatic logout and account replacement", async () => {
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><AuthProvider><Controls /></AuthProvider></QueryClientProvider>);
    await screen.findByText("ready");
    client.setQueryData(["orders"], { private: "account-a" });
    fireEvent.click(screen.getByText("login"));
    expect(client.getQueryData(["orders"])).toBeUndefined();
    client.setQueryData(["notifications"], { private: "account-b" });
    act(() => { window.dispatchEvent(new Event("fudz:logout")); });
    await waitFor(() => expect(client.getQueryData(["notifications"])).toBeUndefined());
  });
});
