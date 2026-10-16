import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: UserRole;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, requireRole, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireRole && role !== requireRole && role !== "admin") {
    return <AccessDenied requireRole={requireRole} />;
  }
  if (allowedRoles && !allowedRoles.includes(role)) return <AccessDenied />;

  return <>{children}</>;
}

function AccessDenied({ requireRole }: { requireRole?: UserRole }) {
  const description = requireRole === "admin"
    ? "The API did not identify this account as a platform administrator. Admin access requires the account's Django is_staff flag. Sign out and back in after the API/admin account is updated."
    : "This account does not have access to the restaurant workspace. Sign in with a restaurant owner or staff account.";
  return <div className="mx-auto mt-16 max-w-lg rounded-2xl bg-card p-8 text-center shadow-sm"><h1 className="text-2xl font-semibold">Access unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{description}</p></div>;
}
