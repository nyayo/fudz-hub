import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  CircleAlert,
  Clock3,
  CreditCard,
  Flame,
  MessageSquareText,
  MoreHorizontal,
  PackageCheck,
  Plus,
  RefreshCw,
  ShoppingBag,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { loadOrderSample } from "@/services/dashboardService";
import { listMenuItems } from "@/services/menuService";
import { listActivePromotions } from "@/services/restaurantService";
import { listReviews } from "@/services/reviewsService";
import { useAuth } from "@/contexts/AuthContext";
import { extractApiError } from "@/lib/api";
import type { Order } from "@/types/orders";
import type { Review } from "@/types/reviews";
import "./Dashboard.css";

type Range = "7d" | "30d";

function money(value: number) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  });
}

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildTrend(orders: Order[], days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const slots = new Map<string, { key: string; label: string; sales: number; orders: number }>();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    slots.set(localDayKey(date), {
      key: localDayKey(date),
      label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      sales: 0,
      orders: 0,
    });
  }

  orders.forEach((order) => {
    if (order.status === "cancelled") return;
    const placedAt = new Date(order.placed_at);
    if (Number.isNaN(placedAt.getTime())) return;
    const slot = slots.get(localDayKey(placedAt));
    if (!slot) return;
    slot.sales += Number(order.total_amount) || 0;
    slot.orders += 1;
  });

  return Array.from(slots.values());
}

function formatPlacedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function RetryNotice({
  title,
  detail,
  onRetry,
  compact = false,
}: {
  title: string;
  detail?: string;
  onRetry: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`dashboard-retry-notice${compact ? " is-compact" : ""}`} role="alert">
      <span className="dashboard-retry-icon"><CircleAlert size={15} /></span>
      <span className="dashboard-retry-copy">
        <strong>{title}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return <span className="mini-stars" aria-label={`${value} out of 5 stars`}><Star size={12} fill="currentColor" /> {value.toFixed(1)}</span>;
}

function getCustomerLabel(review: Review) {
  return review.customer_name || "Customer";
}

export default function Dashboard() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("7d");
  const restaurantId = user?.profile?.restaurant_id ?? user?.profile?.id;
  const restaurantName = typeof user?.profile?.restaurant_name === "string"
    ? user.profile.restaurant_name
    : typeof user?.profile?.restaurant === "string"
      ? user.profile.restaurant
      : "Your restaurant";
  const firstName = user?.first_name || user?.full_name?.split(" ")[0] || "there";

  const orderSampleQ = useQuery({
    queryKey: ["orders", "dashboard-sample", user?.id, restaurantId],
    queryFn: loadOrderSample,
    enabled: !!user,
    staleTime: 30_000,
  });
  const menuAvailableQ = useQuery({
    queryKey: ["menu-items", "dashboard-count", restaurantId, true],
    queryFn: () => listMenuItems({ page: 1, is_available: true, restaurant_id: restaurantId }),
    enabled: !!restaurantId,
    staleTime: 60_000,
  });
  const menuUnavailableQ = useQuery({
    queryKey: ["menu-items", "dashboard-count", restaurantId, false],
    queryFn: () => listMenuItems({ page: 1, is_available: false, restaurant_id: restaurantId }),
    enabled: !!restaurantId,
    staleTime: 60_000,
  });
  const promotionsQ = useQuery({
    queryKey: ["promotions", "dashboard-active", restaurantId],
    queryFn: listActivePromotions,
    enabled: !!restaurantId,
    staleTime: 60_000,
  });
  const reviewsQ = useQuery({
    queryKey: ["reviews", "dashboard-latest", restaurantId],
    queryFn: () => listReviews({ page: 1, restaurant: restaurantId }),
    enabled: !!restaurantId,
    staleTime: 60_000,
  });

  const orderPages = orderSampleQ.data?.pages ?? [];
  const orders = orderPages.flatMap((page) => page.results);
  const latestTotal = orderPages[0]?.count ?? 0;
  const orderLoading = orderSampleQ.isLoading;
  const orderFatalError = orderSampleQ.isError && !orderSampleQ.data;
  const orderProblem = orderSampleQ.isError
    ? extractApiError(orderSampleQ.error, "Order information could not be loaded.")
    : orderSampleQ.data?.partialError;
  const lastOrderPage = orderPages[orderPages.length - 1];
  const sampleComplete = latestTotal <= orders.length || Boolean(lastOrderPage && !lastOrderPage.next);
  const sampleLabel = orderLoading
    ? "Loading orders"
    : orderFatalError
      ? "Order data unavailable"
      : sampleComplete
        ? `All ${latestTotal} orders`
        : `Latest ${orders.length} of ${latestTotal} orders`;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter((order) => new Date(order.placed_at).getTime() >= startOfToday.getTime());
  const nonCancelledToday = todayOrders.filter((order) => order.status !== "cancelled");
  const itemSalesToday = nonCancelledToday.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
  const averageTicket = nonCancelledToday.length ? itemSalesToday / nonCancelledToday.length : 0;
  const needsAttention = orders.filter((order) => order.status === "placed").length;
  const inKitchen = orders.filter((order) => order.status === "accepted").length;
  const awaitingCourier = orders.filter((order) => order.status === "ready").length;
  const onTheWay = orders.filter((order) => order.status === "picked_up").length;
  const paymentIssues = orders.filter((order) => order.payment_status === "pending" || order.payment_status === "failed").length;
  const trend = buildTrend(orders, range === "7d" ? 7 : 30);

  const menuAvailable = menuAvailableQ.data?.count ?? 0;
  const menuUnavailable = menuUnavailableQ.data?.count ?? 0;
  const menuTotal = menuAvailable + menuUnavailable;
  const menuHasError = menuAvailableQ.isError || menuUnavailableQ.isError;
  const menuReady = Boolean(menuAvailableQ.data && menuUnavailableQ.data);
  const menuErrorText = extractApiError(
    menuAvailableQ.isError ? menuAvailableQ.error : menuUnavailableQ.error,
    "Menu availability could not be loaded.",
  );
  const reviewRows = reviewsQ.data?.results ?? [];
  const reviewAverage = reviewRows.length
    ? reviewRows.reduce((total, review) => total + review.rating, 0) / reviewRows.length
    : 0;
  const activePromotions = promotionsQ.data ?? [];

  const retryOrders = () => { void orderSampleQ.refetch(); };
  const retryMenu = () => {
    void menuAvailableQ.refetch();
    void menuUnavailableQ.refetch();
  };
  const retryPromotions = () => { void promotionsQ.refetch(); };
  const retryReviews = () => { void reviewsQ.refetch(); };
  const refreshOverview = () => {
    retryOrders();
    if (restaurantId) {
      retryMenu();
      retryPromotions();
      retryReviews();
    }
  };
  const refreshing = orderSampleQ.isFetching
    || menuAvailableQ.isFetching
    || menuUnavailableQ.isFetching
    || promotionsQ.isFetching
    || reviewsQ.isFetching;

  const metrics = [
    {
      label: "Item sales today",
      value: money(itemSalesToday),
      foot: `${nonCancelledToday.length} non-cancelled order${nonCancelledToday.length === 1 ? "" : "s"} today · recent sample`,
      icon: Banknote,
      accent: "orange",
    },
    {
      label: "Average ticket",
      value: nonCancelledToday.length ? money(averageTicket) : "—",
      foot: nonCancelledToday.length ? "Per non-cancelled order today" : "No non-cancelled orders today",
      icon: CreditCard,
      accent: "green",
    },
    {
      label: "Needs attention",
      value: String(needsAttention),
      foot: "Placed · in recent sample",
      icon: CircleAlert,
      accent: "amber",
    },
    {
      label: "Payment follow-up",
      value: String(paymentIssues),
      foot: "Pending or failed · recent sample",
      icon: Clock3,
      accent: "plum",
    },
  ];

  return (
    <div className="modern-dashboard">
      <header className="dash-hero">
        <div className="dash-title-block">
          <div className="dash-context"><span className="context-pulse" /> RESTAURANT OVERVIEW <span className="context-sep">/</span> {restaurantName.toUpperCase()}</div>
          <h1>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {firstName}<span>·</span></h1>
          <p>Your day, in motion. Here’s the latest from your restaurant.</p>
        </div>
        <div className="dash-actions">
          <div className="date-tile"><span>{new Date().toLocaleDateString(undefined, { weekday: "long" })}</span><strong>{new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}</strong></div>
          <Button variant="outline" className="dash-refresh-action" onClick={refreshOverview} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "dashboard-refresh-spinning" : ""} />
            {refreshing ? "Updating" : "Refresh"}
          </Button>
          <Button asChild className="dash-primary-action"><Link to="/menu"><Plus size={16} /> Add menu item</Link></Button>
        </div>
      </header>

      {!restaurantId && (
        <div className="scope-notice"><CircleAlert size={16} /><span>Restaurant-specific menu, promotion, and review insights require a restaurant profile. Order information below follows the backend account permissions.</span><Link to="/settings">Review settings <ArrowRight size={14} /></Link></div>
      )}

      <section className="metric-grid" aria-label="Key restaurant metrics">
        {metrics.map(({ label, value, foot, icon: Icon, accent }) => (
          <article className={`metric-card metric-${accent}`} key={label}>
            <div className="metric-head"><span>{label}</span><span className="metric-icon"><Icon size={17} /></span></div>
            <div className="metric-value">{orderLoading ? <i className="metric-loading" /> : orderFatalError ? "—" : value}</div>
            <div className="metric-foot">{orderLoading ? "Loading order data…" : orderFatalError ? "Order information unavailable · retry below" : foot}</div>
          </article>
        ))}
      </section>

      <section className={`signal-row${orderFatalError ? " has-signal-error" : ""}`} aria-label="Current service status">
        <div className="signal-heading"><span className="signal-emblem"><Activity size={17} /></span><div><strong>Service pulse</strong><span>Order flow · {sampleLabel.toLowerCase()}</span></div></div>
        <div className="signal-stages">
          <div className="signal-stage"><i className="signal-dot dot-new" /><span>New</span><b>{orderLoading || orderFatalError ? "—" : needsAttention}</b></div>
          <div className="signal-stage"><i className="signal-dot dot-kitchen" /><span>Kitchen</span><b>{orderLoading || orderFatalError ? "—" : inKitchen}</b></div>
          <div className="signal-stage"><i className="signal-dot dot-ready" /><span>Ready</span><b>{orderLoading || orderFatalError ? "—" : awaitingCourier}</b></div>
          <div className="signal-stage"><i className="signal-dot dot-way" /><span>On the way</span><b>{orderLoading || orderFatalError ? "—" : onTheWay}</b></div>
        </div>
        <Link to="/orders" className="signal-link">Open order board <ArrowUpRight size={15} /></Link>
      </section>

      <div className="dashboard-columns">
        <main className="dashboard-main-column">
          <section className="dashboard-surface trend-surface">
            <div className="surface-heading">
              <div><span className="surface-kicker">SALES & MOMENTUM</span><h2>Order activity</h2><p>Item sales and tickets · {sampleLabel.toLowerCase()}</p></div>
              <div className="range-switch" role="group" aria-label="Chart date range">
                <button className={range === "7d" ? "selected" : ""} onClick={() => setRange("7d")} aria-pressed={range === "7d"}>7 days</button>
                <button className={range === "30d" ? "selected" : ""} onClick={() => setRange("30d")} aria-pressed={range === "30d"}>30 days</button>
              </div>
            </div>
            <div className="chart-legend"><span><i className="legend-sales" /> Item sales</span><span><i className="legend-orders" /> Orders</span></div>
            <div className="sales-chart">
              {orderLoading ? <div className="chart-placeholder">Loading order activity…</div> : orderFatalError ? (
                <RetryNotice title="Order activity couldn’t be loaded" detail={orderProblem} onRetry={retryOrders} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesWash" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF6B00" stopOpacity={0.18} /><stop offset="95%" stopColor="#FF6B00" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} dy={8} />
                    <YAxis yAxisId="sales" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(value: number) => value === 0 ? "0" : value >= 1000 ? `${Number((value / 1000).toFixed(value >= 10_000 ? 0 : 1))}k` : String(Math.round(value))} />
                    <YAxis yAxisId="orders" orientation="right" hide domain={[0, "dataMax + 2"]} />
                    <Tooltip
                      cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 4", strokeOpacity: 0.35 }}
                      contentStyle={{ background: "hsl(var(--popover))", border: "none", borderRadius: 12, boxShadow: "0 8px 28px rgba(36,24,64,.13)", color: "hsl(var(--popover-foreground))", fontSize: 12 }}
                      formatter={(value: number, name: string) => [name === "Item sales" ? money(value) : value, name]}
                    />
                    <Area yAxisId="sales" type="monotone" dataKey="sales" name="Item sales" stroke="#FF6B00" strokeWidth={2.5} fill="url(#salesWash)" activeDot={{ r: 4, strokeWidth: 0 }} />
                    <Area yAxisId="orders" type="monotone" dataKey="orders" name="Orders" stroke="#B84A00" strokeWidth={2} fill="none" activeDot={{ r: 3, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            {orderProblem && !orderFatalError && (
              <div className="dashboard-partial-warning" role="status">
                <CircleAlert size={14} /><span>Showing available order data. Some older orders could not be refreshed.</span>
                <button onClick={retryOrders}>Retry</button>
              </div>
            )}
            {!sampleComplete && !orderFatalError && <div className="chart-footnote">Trend uses the newest {orders.length} orders returned for this workspace. Open Analytics for full-period reporting.</div>}
          </section>

          <section className="dashboard-surface recent-surface">
            <div className="surface-heading recent-heading">
              <div><span className="surface-kicker">INCOMING TICKETS</span><h2>Recent orders <span className="inline-count">{orderLoading || orderFatalError ? "—" : latestTotal}</span></h2><p>Newest orders from your permitted workspace.</p></div>
              <Button asChild variant="ghost" className="text-action"><Link to="/orders">View all <ArrowRight size={15} /></Link></Button>
            </div>
            <div className="recent-order-list">
              {orderLoading ? <div className="list-state"><span className="loading-mark" /> Loading latest orders…</div> : orderFatalError ? (
                <RetryNotice title="Recent orders couldn’t be loaded" detail={orderProblem} onRetry={retryOrders} />
              ) : orders.slice(0, 6).length ? orders.slice(0, 6).map((order) => (
                <Link to={`/orders/${order.id}`} className="recent-order" key={order.id}>
                  <span className="order-bag"><ShoppingBag size={15} /></span>
                  <span className="order-main"><strong>Order #{order.id}</strong><small>{order.items?.length ?? 0} items <span>·</span> {formatPlacedAt(order.placed_at)}</small></span>
                  <span className="order-total">{money(Number(order.total_amount) || 0)}</span>
                  <span className="order-status-stack"><OrderStatusBadge status={order.status} /><small className={`payment-label pay-${order.payment_status ?? "pending"}`}>{(order.payment_status ?? "pending").replace("_", " ")}</small></span>
                  <ArrowRight className="order-chevron" size={15} />
                </Link>
              )) : <div className="empty-orders"><span className="empty-orders-mark"><UtensilsCrossed size={18} /></span><strong>Nothing on the pass yet</strong><span>New orders will appear here as soon as they come in.</span><Button asChild variant="outline" size="sm"><Link to="/orders">Open orders</Link></Button></div>}
            </div>
          </section>
        </main>

        <aside className="dashboard-side-column">
          <section className="dashboard-surface menu-surface">
            <div className="side-heading"><div><span className="surface-kicker">CATALOG HEALTH</span><h2>Menu pulse</h2></div><Link to="/menu" className="icon-link" aria-label="Manage menu"><MoreHorizontal size={18} /></Link></div>
            {!restaurantId ? <div className="side-empty">Restaurant profile details aren’t available for this account.</div> : !menuReady && (menuAvailableQ.isLoading || menuUnavailableQ.isLoading) ? (
              <div className="dashboard-side-loading"><span className="loading-mark" /> Loading menu availability…</div>
            ) : !menuReady && menuHasError ? (
              <RetryNotice compact title="Menu availability couldn’t be loaded" detail={menuErrorText} onRetry={retryMenu} />
            ) : (
              <>
                <div className="menu-total"><strong>{menuReady ? menuTotal : "—"}</strong><span>menu items</span></div>
                {menuReady && <>
                  <div className="availability-bar" aria-label={`${menuAvailable} available and ${menuUnavailable} unavailable menu items`}>
                    <span style={{ width: `${menuTotal ? (menuAvailable / menuTotal) * 100 : 0}%` }} />
                  </div>
                  <div className="availability-keys"><span><i className="available-key" /> Available <b>{menuAvailable}</b></span><span><i className="unavailable-key" /> Paused <b>{menuUnavailable}</b></span></div>
                  {menuUnavailable > 0 && <Link to="/menu" className="menu-alert"><CircleAlert size={15} /><span><strong>{menuUnavailable} paused item{menuUnavailable === 1 ? "" : "s"}</strong><small>Review availability before the next rush</small></span><ArrowRight size={14} /></Link>}
                </>}
                {menuHasError && <RetryNotice compact title="Menu counts may be out of date" detail={menuErrorText} onRetry={retryMenu} />}
                <Link to="/menu" className="side-text-link">Manage menu <ArrowRight size={14} /></Link>
              </>
            )}
          </section>

          <section className="dashboard-surface promo-surface">
            <div className="side-heading"><div><span className="surface-kicker">WHAT’S ON</span><h2>Promotions</h2></div><span className="promo-count">{!restaurantId || promotionsQ.isLoading || (promotionsQ.isError && !promotionsQ.data) ? "—" : `${activePromotions.length} live`}</span></div>
            {!restaurantId ? <div className="side-empty">Promotion details require a restaurant profile.</div> : promotionsQ.isLoading && !promotionsQ.data ? (
              <div className="dashboard-side-loading"><span className="loading-mark" /> Loading promotions…</div>
            ) : promotionsQ.isError && !promotionsQ.data ? (
              <RetryNotice compact title="Promotions couldn’t be loaded" detail={extractApiError(promotionsQ.error, "Promotion details are unavailable.")} onRetry={retryPromotions} />
            ) : activePromotions.length ? (
              <div className="promo-list">{activePromotions.slice(0, 3).map((promotion) => (
                <Link to="/promotions" className="promo-item" key={promotion.id}>
                  <span className="promo-icon"><Flame size={15} /></span><span><strong>{promotion.name}</strong><small>{promotion.discount}% off <span>·</span> ends {new Date(promotion.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></span><ArrowRight size={14} />
                </Link>
              ))}</div>
            ) : <div className="side-empty">No active promotions right now. <Link to="/promotions">Create one <ArrowRight size={13} /></Link></div>}
            {restaurantId && promotionsQ.isError && promotionsQ.data && <RetryNotice compact title="Promotion data may be out of date" detail={extractApiError(promotionsQ.error)} onRetry={retryPromotions} />}
            {restaurantId && <Link to="/promotions" className="side-text-link">Manage promotions <ArrowRight size={14} /></Link>}
          </section>

          <section className="dashboard-surface review-surface">
            <div className="side-heading"><div><span className="surface-kicker">CUSTOMER VOICE</span><h2>Recent feedback</h2></div><MessageSquareText size={17} className="side-heading-icon" /></div>
            {!restaurantId ? <div className="side-empty">Restaurant-specific reviews are hidden until this account has a restaurant profile.</div> : (
              <>
                <div className="review-summary">
                  <span className="review-score">{reviewsQ.isLoading && !reviewsQ.data ? "—" : reviewsQ.isError && !reviewsQ.data ? "—" : reviewRows.length ? reviewAverage.toFixed(1) : "—"}</span>
                  <span className="review-stars" aria-label={reviewRows.length ? `Average rating ${reviewAverage.toFixed(1)} out of 5` : "No review rating available"}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} fill="currentColor" className={star <= Math.round(reviewAverage) && reviewRows.length ? "" : "review-star-muted"} />)}</span>
                  <span className="review-total">{reviewsQ.isLoading && !reviewsQ.data ? "—" : reviewsQ.isError && !reviewsQ.data ? "—" : `${reviewsQ.data?.count ?? 0} reviews`}</span>
                </div>
                <div className="review-scope">{reviewsQ.isLoading && !reviewsQ.data ? "Loading recent feedback…" : reviewRows.length ? `Average from the latest ${reviewRows.length} loaded reviews` : "No ratings yet"}</div>
                <div className="review-list">
                  {reviewsQ.isLoading && !reviewsQ.data ? <div className="dashboard-side-loading"><span className="loading-mark" /> Loading feedback…</div> : reviewsQ.isError && !reviewsQ.data ? (
                    <RetryNotice compact title="Feedback couldn’t be loaded" detail={extractApiError(reviewsQ.error, "Review details are unavailable.")} onRetry={retryReviews} />
                  ) : reviewRows.slice(0, 2).length ? reviewRows.slice(0, 2).map((review) => (
                    <article className="review-item" key={review.id}><div className="review-item-head"><strong>{getCustomerLabel(review)}</strong><Stars value={review.rating} /></div><p>{review.comment?.trim() || "Left a rating without a comment."}</p><time>{new Date(review.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></article>
                  )) : <div className="side-empty">Reviews will show here when customers share feedback.</div>}
                </div>
                {reviewsQ.isError && reviewsQ.data && <RetryNotice compact title="Feedback may be out of date" detail={extractApiError(reviewsQ.error)} onRetry={retryReviews} />}
                <Link to="/reviews" className="side-text-link">Read all reviews <ArrowRight size={14} /></Link>
              </>
            )}
          </section>

          <section className="quick-links">
            <span className="surface-kicker">QUICK ACCESS</span>
            <Link to="/deliveries"><PackageCheck size={16} /> Deliveries <ArrowRight size={14} /></Link>
            <Link to="/analytics"><Activity size={16} /> Full analytics <ArrowRight size={14} /></Link>
            <Link to="/settings"><BadgeCheck size={16} /> Restaurant settings <ArrowRight size={14} /></Link>
          </section>
        </aside>
      </div>
    </div>
  );
}