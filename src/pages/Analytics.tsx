import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { listOrders } from "@/services/ordersService";
import type { Order } from "@/types/orders";

type RangeKey = "7d" | "30d" | "90d";
const RANGE_DAYS: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90 };

function money(v: number) {
  return v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildDailySeries(orders: Order[], days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const map = new Map<string, { date: string; revenue: number; orders: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    map.set(dayKey(d), { date: dayKey(d), revenue: 0, orders: 0 });
  }
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const k = dayKey(new Date(o.placed_at));
    const slot = map.get(k);
    if (!slot) continue;
    slot.revenue += Number(o.total_amount) || 0;
    slot.orders += 1;
  }
  return Array.from(map.values()).map((r) => ({
    ...r,
    label: new Date(r.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));
}

function buildTopItems(orders: Order[]) {
  const tally = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    for (const it of o.items ?? []) {
      const name = it.menu_item?.name ?? `Item #${it.menu_item?.id}`;
      const slot = tally.get(name) ?? { name, qty: 0, revenue: 0 };
      slot.qty += it.qty;
      slot.revenue += (Number(it.unit_price) || 0) * it.qty;
      tally.set(name, slot);
    }
  }
  return Array.from(tally.values()).sort((a, b) => b.qty - a.qty).slice(0, 8);
}

function buildPeakHours(orders: Order[]) {
  const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${h}:00`, orders: 0 }));
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const h = new Date(o.placed_at).getHours();
    buckets[h].orders += 1;
  }
  return buckets;
}

function buildStatusBreakdown(orders: Order[]) {
  const tally = new Map<string, number>();
  for (const o of orders) {
    tally.set(o.status, (tally.get(o.status) ?? 0) + 1);
  }
  return Array.from(tally.entries()).map(([name, value]) => ({ name, value }));
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted))",
  "hsl(var(--destructive))",
  "hsl(var(--ring))",
];

export default function Analytics() {
  const [range, setRange] = useState<RangeKey>("30d");

  // Fetch a few pages to get a meaningful sample. Client-side aggregation.
  const pagesToFetch = 3;
  const results = useQueries({
    queries: Array.from({ length: pagesToFetch }, (_, i) => i + 1).map((page) => ({
      queryKey: ["orders", { page, status: "all", search: "" }],
      queryFn: () => listOrders({ page }),
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const updatedKey = results.map((r) => r.dataUpdatedAt).join(",");
  const orders = useMemo(
    () => results.flatMap((r) => r.data?.results ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updatedKey],
  );

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (RANGE_DAYS[range] - 1));
    return d.getTime();
  }, [range]);

  const inRange = useMemo(
    () => orders.filter((o) => new Date(o.placed_at).getTime() >= cutoff),
    [orders, cutoff],
  );

  const daily = useMemo(() => buildDailySeries(inRange, RANGE_DAYS[range]), [inRange, range]);
  const topItems = useMemo(() => buildTopItems(inRange), [inRange]);
  const peakHours = useMemo(() => buildPeakHours(inRange), [inRange]);
  const statusMix = useMemo(() => buildStatusBreakdown(inRange), [inRange]);

  const totalRevenue = inRange.reduce(
    (s, o) => (o.status === "cancelled" ? s : s + (Number(o.total_amount) || 0)),
    0,
  );
  const totalOrders = inRange.filter((o) => o.status !== "cancelled").length;
  const avgOrder = totalOrders ? totalRevenue / totalOrders : 0;
  const cancelRate = inRange.length
    ? (inRange.filter((o) => o.status === "cancelled").length / inRange.length) * 100
    : 0;

  const kpis = [
    { label: "Revenue", value: money(totalRevenue) },
    { label: "Orders", value: totalOrders.toString() },
    { label: "Avg order value", value: money(avgOrder) },
    { label: "Cancel rate", value: `${cancelRate.toFixed(1)}%` },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Trends and insights across your recent orders.
          </p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <TabsList>
            <TabsTrigger value="7d">7 days</TabsTrigger>
            <TabsTrigger value="30d">30 days</TabsTrigger>
            <TabsTrigger value="90d">90 days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {isLoading ? <Skeleton className="h-7 w-24" /> : k.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Revenue & orders</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="hsl(var(--accent-foreground))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Top menu items</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : topItems.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No data in range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItems} layout="vertical" margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis type="category" dataKey="name" width={120} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="qty" name="Units sold" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Peak hours</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHours} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="orders" name="Orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Order status mix</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : statusMix.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No data in range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusMix} dataKey="value" nameKey="name" outerRadius={90} label>
                  {statusMix.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}