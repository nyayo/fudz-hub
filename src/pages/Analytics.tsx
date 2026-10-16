import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
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
import { Activity, BarChart3, Clock3, Package, TrendingUp, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { listOrders } from "@/services/ordersService";
import type { Order } from "@/types/orders";

type RangeKey = "7d" | "30d" | "90d";
const RANGE_DAYS: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90 };
const PIE_COLORS = ["#168260", "#73ad94", "#d49a54", "#d9765e", "#668277", "#aec9bb"];
const chartGrid = "#edf1ee";
const chartText = "#87948d";

function money(value: number) {
  return value.toLocaleString(undefined, { style: "currency", currency: "UGX", maximumFractionDigits: 0 });
}

function moneyTick(value: number) {
  return Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildDailySeries(orders: Order[], days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const map = new Map<string, { date: string; revenue: number; orders: number }>();
  for (let index = days - 1; index >= 0; index--) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    map.set(dayKey(date), { date: dayKey(date), revenue: 0, orders: 0 });
  }
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const key = dayKey(new Date(order.placed_at));
    const slot = map.get(key);
    if (!slot) continue;
    slot.revenue += Number(order.total_amount) || 0;
    slot.orders += 1;
  }
  return Array.from(map.values()).map((row) => ({
    ...row,
    label: new Date(`${row.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));
}

function buildTopItems(orders: Order[]) {
  const tally = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    for (const item of order.items ?? []) {
      const name = item.menu_item?.name || item.menu_item?.title || "Menu item";
      const slot = tally.get(name) ?? { name, qty: 0, revenue: 0 };
      slot.qty += item.qty;
      slot.revenue += (Number(item.unit_price) || 0) * item.qty;
      tally.set(name, slot);
    }
  }
  return Array.from(tally.values()).sort((first, second) => second.qty - first.qty).slice(0, 8);
}

function buildPeakHours(orders: Order[]) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, label: `${hour}:00`, orders: 0 }));
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    buckets[new Date(order.placed_at).getHours()].orders += 1;
  }
  return buckets;
}

function buildStatusBreakdown(orders: Order[]) {
  const tally = new Map<string, number>();
  for (const order of orders) tally.set(order.status, (tally.get(order.status) ?? 0) + 1);
  return Array.from(tally.entries()).map(([name, value]) => ({ name, value }));
}

function cutoffForRange(range: RangeKey) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (RANGE_DAYS[range] - 1));
  return date.getTime();
}

function ChartEmptyState({ children = "No activity in this period." }: { children?: string }) {
  return <div className="analytics-empty-state"><Activity size={20}/><span>{children}</span></div>;
}

export default function Analytics() {
  const [range, setRange] = useState<RangeKey>("30d");
  const ordersQuery = useInfiniteQuery({
    queryKey: ["orders", "analytics-all-pages", range],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listOrders({ page: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.next) return undefined;
      const oldestOrderOnPage = lastPage.results[lastPage.results.length - 1];
      if (oldestOrderOnPage && new Date(oldestOrderOnPage.placed_at).getTime() < cutoffForRange(range)) return undefined;
      return pages.length + 1;
    },
  });
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = ordersQuery;

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError]);

  const isLoading = ordersQuery.isLoading || Boolean(ordersQuery.hasNextPage && !ordersQuery.isFetchNextPageError);
  const hasError = ordersQuery.isError || ordersQuery.isFetchNextPageError;
  const failedWithoutData = hasError && !ordersQuery.data;
  const orders = useMemo(() => ordersQuery.data?.pages.flatMap((page) => page.results) ?? [], [ordersQuery.data]);
  const cutoff = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (RANGE_DAYS[range] - 1));
    return date.getTime();
  }, [range]);
  const inRange = useMemo(() => orders.filter((order) => new Date(order.placed_at).getTime() >= cutoff), [orders, cutoff]);
  const daily = useMemo(() => buildDailySeries(inRange, RANGE_DAYS[range]), [inRange, range]);
  const topItems = useMemo(() => buildTopItems(inRange), [inRange]);
  const peakHours = useMemo(() => buildPeakHours(inRange), [inRange]);
  const statusMix = useMemo(() => buildStatusBreakdown(inRange), [inRange]);
  const totalRevenue = inRange.reduce((sum, order) => order.status === "cancelled" ? sum : sum + (Number(order.total_amount) || 0), 0);
  const totalOrders = inRange.filter((order) => order.status !== "cancelled").length;
  const averageOrder = totalOrders ? totalRevenue / totalOrders : 0;
  const cancelledOrders = inRange.filter((order) => order.status === "cancelled").length;
  const cancelRate = inRange.length ? (cancelledOrders / inRange.length) * 100 : 0;
  const kpis = [
    { label: "Revenue", value: money(totalRevenue), detail: "Excluding cancelled orders", icon: Wallet },
    { label: "Completed & active orders", value: totalOrders.toLocaleString(), detail: "Orders in the selected period", icon: Package },
    { label: "Average order value", value: money(averageOrder), detail: "Revenue divided by active orders", icon: TrendingUp },
    { label: "Cancellation rate", value: `${cancelRate.toFixed(1)}%`, detail: `${cancelledOrders} cancelled orders`, icon: Activity },
  ];
  const tooltipStyle = { background: "#fff", border: "1px solid #e5ebe8", borderRadius: 12, boxShadow: "0 8px 24px rgba(25,51,42,.1)", color: "#30453a", fontSize: 11 };

  return (
    <div className="page-stack analytics-page">
      <header className="page-heading analytics-heading">
        <div><p className="eyebrow">BUSINESS INTELLIGENCE</p><h1>Analytics</h1><p>Understand order volume, revenue and service patterns at a glance.</p></div>
        <Tabs value={range} onValueChange={(value) => setRange(value as RangeKey)}>
          <TabsList className="orders-status-tabs"><TabsTrigger value="7d">7 days</TabsTrigger><TabsTrigger value="30d">30 days</TabsTrigger><TabsTrigger value="90d">90 days</TabsTrigger></TabsList>
        </Tabs>
      </header>

      {isLoading && ordersQuery.data && <div className="analytics-loading-notice" role="status">Loading order pages for the selected period… {orders.length.toLocaleString()} orders loaded</div>}
      {hasError && <div className="analytics-data-notice" role="status"><span>{ordersQuery.data ? "Some order pages could not be loaded. Figures below may be incomplete." : "Order data could not be loaded; figures are unavailable."}</span><button type="button" className="analytics-retry-action" onClick={() => void ordersQuery.refetch()}>Retry loading</button></div>}

      <section className="analytics-kpis" aria-label="Key business metrics">
        {kpis.map((metric) => <Card key={metric.label} className="analytics-kpi"><span className="analytics-kpi-icon"><metric.icon size={17}/></span><div className="analytics-kpi-copy"><span>{metric.label}</span><strong>{isLoading ? <Skeleton className="h-7 w-24"/> : failedWithoutData ? "—" : metric.value}</strong><small>{metric.detail}</small></div></Card>)}
      </section>

      <section className="analytics-chart-grid analytics-chart-grid-primary">
        <Card className="analytics-chart-card">
          <div className="analytics-chart-heading"><div><span className="eyebrow">PERFORMANCE TREND</span><h2>Revenue & orders</h2><p>Day-by-day activity for the selected period.</p></div><span className="analytics-heading-icon"><BarChart3 size={16}/></span></div>
          <div className="analytics-chart-body">
            {isLoading ? <Skeleton className="h-full w-full"/> : failedWithoutData ? <ChartEmptyState>Order data could not be loaded.</ChartEmptyState> : daily.every((row) => row.orders === 0) ? <ChartEmptyState/> : <ResponsiveContainer width="100%" height="100%"><LineChart data={daily} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 5" stroke={chartGrid}/>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 10 }} minTickGap={18}/>
              <YAxis yAxisId="revenue" axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 10 }} tickFormatter={moneyTick} width={42}/>
              <YAxis yAxisId="orders" orientation="right" axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 10 }} allowDecimals={false} width={28}/>
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number | string, name: string) => [name === "Revenue" ? money(Number(value)) : value, name]} labelStyle={{ color: "#677970", marginBottom: 4 }}/>
              <Legend wrapperStyle={{ fontSize: 10, color: chartText, paddingTop: 8 }}/>
              <Line yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke="#18815f" strokeWidth={2.8} dot={false} activeDot={{ r: 4, strokeWidth: 0 }}/>
              <Line yAxisId="orders" type="monotone" dataKey="orders" name="Orders" stroke="#d48a4d" strokeWidth={2.3} dot={false} activeDot={{ r: 4, strokeWidth: 0 }}/>
            </LineChart></ResponsiveContainer>}
          </div>
        </Card>

        <Card className="analytics-chart-card">
          <div className="analytics-chart-heading"><div><span className="eyebrow">FULFILMENT</span><h2>Order status mix</h2><p>Distribution across statuses.</p></div><span className="analytics-heading-icon is-warm"><Activity size={16}/></span></div>
          <div className="analytics-chart-body analytics-status-chart">
            {isLoading ? <Skeleton className="h-full w-full"/> : failedWithoutData ? <ChartEmptyState>Order data could not be loaded.</ChartEmptyState> : statusMix.length === 0 ? <ChartEmptyState/> : <ResponsiveContainer width="100%" height="100%"><PieChart>
              <Pie data={statusMix} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3} stroke="none">
                {statusMix.map((entry, index) => <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]}/>) }
              </Pie>
              <Tooltip contentStyle={tooltipStyle}/><Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: chartText }}/>
            </PieChart></ResponsiveContainer>}
          </div>
        </Card>
      </section>

      <section className="analytics-chart-grid">
        <Card className="analytics-chart-card">
          <div className="analytics-chart-heading"><div><span className="eyebrow">MENU PERFORMANCE</span><h2>Top-selling items</h2><p>Ranked by units sold in this period.</p></div><span className="analytics-heading-icon"><Package size={16}/></span></div>
          <div className="analytics-chart-body">
            {isLoading ? <Skeleton className="h-full w-full"/> : failedWithoutData ? <ChartEmptyState>Order data could not be loaded.</ChartEmptyState> : topItems.length === 0 ? <ChartEmptyState/> : <ResponsiveContainer width="100%" height="100%"><BarChart data={topItems} layout="vertical" margin={{ top: 4, right: 15, left: 2, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 5" stroke={chartGrid}/>
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 10 }} allowDecimals={false}/>
              <YAxis type="category" dataKey="name" width={116} axisLine={false} tickLine={false} tick={{ fill: "#596b62", fontSize: 10 }}/>
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value, "Units sold"]}/>
              <Bar dataKey="qty" name="Units sold" fill="#18815f" radius={[0, 6, 6, 0]} maxBarSize={20}/>
            </BarChart></ResponsiveContainer>}
          </div>
        </Card>

        <Card className="analytics-chart-card">
          <div className="analytics-chart-heading"><div><span className="eyebrow">SERVICE RHYTHM</span><h2>Peak order hours</h2><p>Order counts by local hour.</p></div><span className="analytics-heading-icon is-warm"><Clock3 size={16}/></span></div>
          <div className="analytics-chart-body">
            {isLoading ? <Skeleton className="h-full w-full"/> : failedWithoutData ? <ChartEmptyState>Order data could not be loaded.</ChartEmptyState> : peakHours.every((row) => row.orders === 0) ? <ChartEmptyState/> : <ResponsiveContainer width="100%" height="100%"><BarChart data={peakHours} margin={{ top: 10, right: 6, left: -15, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 5" stroke={chartGrid}/>
              <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 9 }} interval={2} tickFormatter={(hour: number) => `${String(hour).padStart(2, "0")}:00`}/>
              <YAxis axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 9 }} allowDecimals={false} width={28}/>
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(hour: number) => `${String(hour).padStart(2, "0")}:00`} formatter={(value: number) => [value, "Orders"]}/>
              <Bar dataKey="orders" name="Orders" fill="#d48a4d" radius={[5, 5, 0, 0]} maxBarSize={20}/>
            </BarChart></ResponsiveContainer>}
          </div>
        </Card>
      </section>

      <p className="analytics-footnote">Analytics loads all pages needed for the selected date range. Cancelled orders are excluded from revenue and average order value.</p>
    </div>
  );
}
