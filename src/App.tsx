import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
const Login = lazy(() => import("./pages/Login"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const ActivateInvitation = lazy(() => import("./pages/ActivateInvitation"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Menu = lazy(() => import("./pages/Menu"));
const Categories = lazy(() => import("./pages/Categories"));
const Promotions = lazy(() => import("./pages/Promotions"));
const Settings = lazy(() => import("./pages/Settings"));
const Deliveries = lazy(() => import("./pages/Deliveries"));
const Reviews = lazy(() => import("./pages/Reviews"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Staff = lazy(() => import("./pages/Staff"));
const Account = lazy(() => import("./pages/Account"));
const NotificationHelp = lazy(() => import("./pages/NotificationHelp"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminRestaurants = lazy(() => import("./pages/AdminRestaurants"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminWishlists = lazy(() => import("./pages/AdminWishlists"));
import { useAuth } from "@/contexts/AuthContext";

function HomeRedirect() {
  const { role } = useAuth();
  return <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />;
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<div className="route-loading" role="status">Loading workspace…</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/activate-invitation" element={<ActivateInvitation />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<HomeRedirect />} />
              <Route element={<ProtectedRoute requireRole="admin"><Outlet /></ProtectedRoute>}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/restaurants" element={<AdminRestaurants />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/wishlists" element={<AdminWishlists />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={["owner", "manager", "waiter", "cashier", "staff", "admin"]}><Outlet /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/deliveries" element={<Deliveries />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/account" element={<Account />} />
                <Route path="/help/notifications" element={<NotificationHelp />} />
                <Route path="/notification-setup.md" element={<Navigate to="/help/notifications" replace />} />
              </Route>
              <Route element={<ProtectedRoute requireRole="owner"><Outlet /></ProtectedRoute>}>
                <Route path="/menu" element={<Menu />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/promotions" element={<Promotions />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/staff" element={<Staff />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
