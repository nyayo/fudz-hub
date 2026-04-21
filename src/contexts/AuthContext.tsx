import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { tokenStorage } from "@/lib/api";

export type UserRole = "admin" | "staff" | string;

export interface AuthUser {
  id?: string | number;
  email: string;
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
  if (typeof user.role === "string" && user.role) return user.role;
  if (user.is_superuser || user.is_staff) return "admin";
  return "staff";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      const access = tokenStorage.getAccess();
      if (raw && access) setUser(JSON.parse(raw));
    } catch {
      // ignore
    }
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
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