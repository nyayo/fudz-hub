import { Link, Navigate, useLocation } from "react-router-dom";
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
    ? "This page is available to platform administrators. Your current account can continue using its workspace."
    : "This page is available to restaurant owners. You can continue managing orders with your current account.";
  return <div className="mx-auto mt-16 max-w-lg rounded-2xl bg-card p-8 text-center shadow-sm"><h1 className="text-2xl font-semibold">Access unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{description}</p><Link className="access-return-link" to="/orders">Return to orders</Link></div>;
}
