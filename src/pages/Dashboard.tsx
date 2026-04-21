import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { listOrders } from "@/services/ordersService";
import { useAuth } from "@/contexts/AuthContext";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function money(v: number) {
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const recentQ = useQuery({ queryKey: ["orders", { page: 1, status: "all", search: "" }], queryFn: () => listOrders({ page: 1 }) });

  const today = startOfToday().getTime();
  const all = recentQ.data?.results ?? [];
  const todays = all.filter((o) => new Date(o.placed_at).getTime() >= today);
  const revenueToday = todays.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const pending = all.filter((o) => o.status === "placed" || o.status === "accepted").length;
  const inDelivery = all.filter((o) => o.status === "ready" || o.status === "picked_up").length;

  const kpis = [
    { label: "Orders today", value: todays.length.toString() },
    { label: "Revenue today", value: money(revenueToday) },
    { label: "In delivery", value: inDelivery.toString() },
    { label: "Pending", value: pending.toString() },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {user?.first_name || user?.email?.split("@")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">Here's a quick look at your restaurant today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {recentQ.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : k.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-medium">Recent orders</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/orders">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">#</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentQ.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin inline text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : all.slice(0, 5).length > 0 ? (
                all.slice(0, 5).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      <Link to={`/orders/${o.id}`} className="hover:underline">
                        #{o.id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">Customer #{o.customer}</TableCell>
                    <TableCell>{money(Number(o.total_amount) || 0)}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(o.placed_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    No orders yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
