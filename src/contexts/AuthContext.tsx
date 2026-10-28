import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { tokenStorage, clearLegacySession, restoreBrowserSession, endBrowserSession } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { detachBrowserPush } from "@/services/webPushService";
import { toast } from "@/hooks/use-toast";
import { getUserProfile } from "@/services/authService";

export type UserRole = "admin" | "staff" | string;

export interface AuthUser {
  id?: string | number;
  email: string;
  user_type?: string;
  profile?: {
    id?: number;
    restaurant_id?: number;
    restaurant_name?: string;
    is_approved?: boolean;
    is_active?: boolean;
    [key: string]: unknown;
  } | null;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role?: UserRole;
  is_staff?: boolean;
  is_superuser?: boolean;
  [key: string]: unknown;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole;
  loginWithTokens: (user: AuthUser, access: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function deriveRole(user: AuthUser | null): UserRole {
  if (!user) return "guest";
  if (user.is_superuser || user.is_staff) return "admin";
  if (typeof user.role === "string" && user.role) return user.role;
  if (user.user_type === "restaurant") return "owner";
  if (user.user_type === "restaurant_staff" && typeof user.profile?.role === "string") return user.profile.role;
  if (user.user_type === "customer" || user.user_type === "courier") return user.user_type;
  return "staff";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    clearLegacySession();
    const restoreSession = async () => {
      try {
        const access = await restoreBrowserSession();
        if (!access || cancelled) return;
        const fresh = await getUserProfile();
        if (!cancelled && tokenStorage.getAccess() === access) setUser({ ...fresh } as AuthUser);
      } catch {
        // A session is authenticated only after the API validates it.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void restoreSession();
    return () => { cancelled = true; };
  }, []);

  const logout = useCallback(() => {
    void queryClient.cancelQueries();
    queryClient.clear();
    setUser(null);
    void endBrowserSession(detachBrowserPush).catch(() => {
      toast({ title: "Server sign-out could not be confirmed", description: "Your local session was cleared. Reconnect and sign out again to revoke the browser session.", variant: "destructive" });
    });
  }, [queryClient]);

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener("fudz:logout", handler);
    return () => window.removeEventListener("fudz:logout", handler);
  }, [logout]);

  const loginWithTokens = useCallback((nextUser: AuthUser, access: string) => {
    void queryClient.cancelQueries();
    queryClient.clear();
    tokenStorage.set(access);
    setUser(nextUser);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      role: deriveRole(user),
      loginWithTokens,
      logout,
    }),
    [user, isLoading, loginWithTokens, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
