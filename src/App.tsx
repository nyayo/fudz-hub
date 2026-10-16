import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Menu from "./pages/Menu";
import Categories from "./pages/Categories";
import Promotions from "./pages/Promotions";
import Settings from "./pages/Settings";
import Deliveries from "./pages/Deliveries";
import Reviews from "./pages/Reviews";
import Analytics from "./pages/Analytics";
import Staff from "./pages/Staff";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRestaurants from "./pages/AdminRestaurants";
import AdminUsers from "./pages/AdminUsers";
import AdminWishlists from "./pages/AdminWishlists";
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
          <Routes>
            <Route path="/login" element={<Login />} />
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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
