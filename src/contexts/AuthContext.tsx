import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { tokenStorage } from "@/lib/api";
import { getUserProfile, logoutApi } from "@/services/authService";

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
  loginWithTokens: (user: AuthUser, access: string, refresh?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_KEY = "fudz_user";

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

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      let cached: AuthUser | null = null;
      try {
        const raw = localStorage.getItem(USER_KEY);
        const access = tokenStorage.getAccess();
        if (raw && access) {
          cached = JSON.parse(raw) as AuthUser;
          setUser(cached);
        }
      } catch {
        // Fall back to an unauthenticated session if local data is malformed.
      }

      if (cached) {
        try {
          const fresh = await getUserProfile();
          const nextUser = { ...cached, ...fresh } as AuthUser;
          delete nextUser.role;
          if (!cancelled) {
            localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
            setUser(nextUser);
          }
        } catch {
          // Retain a valid cached session if the profile endpoint is temporarily unavailable.
        }
      }
      if (!cancelled) setIsLoading(false);
    };

    void restoreSession();
    return () => { cancelled = true; };
  }, []);

  const logout = useCallback(() => {
    const refresh = tokenStorage.getRefresh();
    if (refresh) void logoutApi(refresh).catch(() => undefined);
    tokenStorage.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener("fudz:logout", handler);
    return () => window.removeEventListener("fudz:logout", handler);
  }, [logout]);

  const loginWithTokens = useCallback((nextUser: AuthUser, access: string, refresh?: string) => {
    tokenStorage.set(access, refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

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
