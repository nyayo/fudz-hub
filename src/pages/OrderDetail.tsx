import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ImageOff,
  Loader2,
  MapPin,
  PackageCheck,
  ReceiptText,
  Store,
  UserRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import {
  acceptOrder,
  getOrder,
  updateOrderStatus,
} from "@/services/ordersService";
import {
  NEXT_STATUS,
  ORDER_STATUS_LABEL,
  type Order,
  type OrderStatus,
} from "@/types/orders";
import { extractApiError } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { OrderRouteMap } from "@/components/orders/OrderRouteMap";

function money(v: number | string | undefined | null) {
  if (v == null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "UGX" });
}

type Coordinates = [number, number];
function validCoordinates(
  latitude: number,
  longitude: number,
): Coordinates | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    (latitude === 0 && longitude === 0)
  )
    return null;
  return [latitude, longitude];
}
function locationCoordinates(
  location: Order["pickup_location"] | Order["dropoff_location"],
): Coordinates | null {
  if (!location) return null;
  if (typeof location === "string") {
    const point = location.match(
      /POINT(?:\s+Z)?\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/i,
    );
    return point ? validCoordinates(Number(point[2]), Number(point[1])) : null;
  }
  if (Array.isArray(location.coordinates) && location.coordinates.length >= 2)
    return validCoordinates(
      Number(location.coordinates[1]),
      Number(location.coordinates[0]),
    );
  const lat = location.latitude ?? location.lat;
  const lng = location.longitude ?? location.lng;
  return lat != null && lng != null
    ? validCoordinates(Number(lat), Number(lng))
    : null;
}
function destinationCoordinates(order: Order): Coordinates | null {
  if (order.dropoff_latitude != null && order.dropoff_longitude != null) {
    const known = validCoordinates(
      Number(order.dropoff_latitude),
      Number(order.dropoff_longitude),
    );
    if (known) return known;
  }
  return locationCoordinates(order.dropoff_location);
}
function pickupCoordinates(order: Order): Coordinates | null {
  if (order.pickup_latitude != null && order.pickup_longitude != null) {
    const known = validCoordinates(
      Number(order.pickup_latitude),
      Number(order.pickup_longitude),
    );
    if (known) return known;
  }
  return locationCoordinates(order.pickup_location);
}
function destinationAddress(order: Order) {
  const location = order.dropoff_location;
  if (typeof location === "string" && !/POINT\s*\(/i.test(location))
    return location;
  if (
    typeof location === "object" &&
    location &&
    "address" in location &&
    typeof location.address === "string"
  )
    return location.address;
  return null;
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const orderQ = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(id!),
    enabled: !!id,
  });
  const advance = useMutation({
    mutationFn: async ({ next }: { next: OrderStatus }) => {
      const order = orderQ.data!;
      if (order.status === "placed" && next === "accepted")
        return acceptOrder(order.id);
      return updateOrderStatus(order.id, next);
    },
    onSuccess: (data) => {
      qc.setQueryData<Order>(["order", id], (old) => (old ? { ...old, ...data } : data));
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Status updated",
        description: `Order #${data.id} · ${ORDER_STATUS_LABEL[data.status]}`,
      });
    },
    onError: (err) =>
      toast({
        title: "Update failed",
        description: extractApiError(err),
        variant: "destructive",
      }),
  });
  const cancel = useMutation({
    mutationFn: () => updateOrderStatus(orderQ.data!.id, "cancelled"),
    onSuccess: (data) => {
      qc.setQueryData<Order>(["order", id], (old) => (old ? { ...old, ...data } : data));
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Status updated",
        description: `Order #${data.id} · ${ORDER_STATUS_LABEL[data.status]}`,
      });
    },
    onError: (err) =>
      toast({
        title: "Cancel failed",
        description: extractApiError(err),
        variant: "destructive",
      }),
  });

  if (orderQ.isLoading)
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (orderQ.isError || !orderQ.data)
    return (
      <div className="page-stack max-w-2xl">
        <Button asChild variant="ghost" size="sm">
          <Link to="/orders">
            <ArrowLeft size={16} />
            Back to orders
          </Link>
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-sm text-destructive">
            {orderQ.isError
              ? extractApiError(orderQ.error)
              : "Order not found."}
          </CardContent>
        </Card>
      </div>
    );

  const order: Order = orderQ.data;
  const items = order.items ?? [];
  const next = NEXT_STATUS[order.status];
  const terminal = order.status === "delivered" || order.status === "cancelled";
  const origin = pickupCoordinates(order);
  const destination = destinationCoordinates(order);
  const address = destinationAddress(order);
  const itemQuantity = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.unit_price) || 0) * item.qty,
    0,
  );

  return (
    <div className="page-stack max-w-7xl order-detail-page">
      <div className="order-detail-breadcrumb">
        <Button asChild variant="ghost" size="sm">
          <Link to="/orders">
            <ArrowLeft size={15} />
            Orders
          </Link>
        </Button>
        <span>/</span>
        <span>Order #{order.id}</span>
      </div>
      <header className="order-detail-hero">
        <div>
          <p className="eyebrow">
            ORDER OPERATIONS ·{" "}
            {new Date(order.placed_at).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <div className="order-detail-title-line">
            <h1>Order #{order.id}</h1>
            <OrderStatusBadge
              status={order.status}
              className="order-detail-status"
            />
          </div>
          <p>
            {order.restaurant_name || "Restaurant"}
            <span className="order-hero-dot">·</span>
            <Clock3 size={13} />
            {new Date(order.placed_at).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="order-detail-hero-actions">
          {!terminal && next && (
            <Button
              onClick={() => advance.mutate({ next })}
              disabled={advance.isPending}
            >
              {advance.isPending ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <CheckCircle2 size={15} />
              )}
              Mark {ORDER_STATUS_LABEL[next]}
            </Button>
          )}
          {!terminal && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
            >
              {cancel.isPending ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                "Cancel order"
              )}
            </Button>
          )}
        </div>
      </header>

      <section className="order-detail-stat-strip">
        <div>
          <span className="order-stat-icon">
            <PackageCheck size={17} />
          </span>
          <span>
            <small>Items</small>
            <strong>{itemQuantity} units</strong>
          </span>
        </div>
        <div>
          <span className="order-stat-icon">
            <ReceiptText size={17} />
          </span>
          <span>
            <small>Order total</small>
            <strong>{money(order.total_amount ?? order.total_price)}</strong>
          </span>
        </div>
        <div>
          <span className="order-stat-icon">
            <UserRound size={17} />
          </span>
          <span>
            <small>Customer</small>
            <strong>{order.customer_name || "Customer"}</strong>
          </span>
        </div>
      </section>

      <div className="order-detail-layout">
        <div className="order-detail-main-column">
          <Card className="order-detail-card">
            <CardHeader className="order-section-heading">
              <div>
                <p className="eyebrow">PURCHASE</p>
                <CardTitle>Items ordered</CardTitle>
              </div>
              <span className="order-item-count">
                {order.items.length} line{order.items.length === 1 ? "" : "s"}
              </span>
            </CardHeader>
            <CardContent className="order-lines">
              {order.items.map((it) => {
                const image =
                  it.menu_item?.images?.[0]?.image ?? it.menu_item?.image;
                const name =
                  it.menu_item?.name || it.menu_item?.title || "Menu item";
                return (
                  <div key={it.id} className="order-line-item">
                    {image ? (
                      <img
                        src={image}
                        alt={name}
                        className="menu-item-image order-detail-item-image"
                      />
                    ) : (
                      <div className="menu-item-image order-detail-item-image order-item-empty">
                        <ImageOff size={18} />
                      </div>
                    )}
                    <div className="order-line-description">
                      <strong>{name}</strong>
                      <span>
                        {it.qty} × {money(it.unit_price)}
                        {it.promotion && <em>{it.promotion.name}</em>}
                      </span>
                    </div>
                    <strong className="order-line-total">
                      {money(Number(it.unit_price) * it.qty)}
                    </strong>
                  </div>
                );
              })}
              <div className="order-bill">
                <BillRow
                  label="Subtotal"
                  value={money(subtotal || order.total_price)}
                />
                {Number(order.delivery_fee) > 0 && (
                  <BillRow label="Delivery" value={money(order.delivery_fee)} />
                )}
                {Number(order.tax) > 0 && (
                  <BillRow label="Tax" value={money(order.tax)} />
                )}
                {Number(order.total_discount) > 0 && (
                  <BillRow
                    label="Discount"
                    value={`− ${money(order.total_discount)}`}
                  />
                )}
                <Separator />
                <BillRow
                  label={<strong>Total paid</strong>}
                  value={
                    <strong>
                      {money(order.total_amount ?? order.total_price)}
                    </strong>
                  }
                  highlight
                />
              </div>
            </CardContent>
          </Card>

          <Card className="order-detail-card">
            <CardHeader className="order-section-heading">
              <div>
                <p className="eyebrow">DELIVERY</p>
                <CardTitle>Route & destination</CardTitle>
              </div>
              <span className="order-route-live">
                <span />
                Route view
              </span>
            </CardHeader>
            <CardContent className="order-map-content">
              {origin && destination ? (
                <>
                  <OrderRouteMap origin={origin} destination={destination} />
                  <div className="order-route-summary">
                    <div className="order-route-point">
                      <strong>Pickup</strong>
                      <span>{order.restaurant_name || "Restaurant"}</span>
                      <small>
                        {origin[0].toFixed(5)}, {origin[1].toFixed(5)}
                      </small>
                    </div>
                    <div className="order-route-point is-destination">
                      <strong>Drop-off</strong>
                      <span>{address || "Customer destination"}</span>
                      <small>
                        {destination[0].toFixed(5)}, {destination[1].toFixed(5)}
                      </small>
                    </div>
                  </div>
                </>
              ) : (
                <div className="order-map-empty">
                  <MapPin size={21} />
                  <strong>Route coordinates unavailable</strong>
                  <span>
                    {!origin
                      ? "Add the restaurant pickup location in Admin → Restaurants."
                      : address ||
                        "The customer destination coordinates are missing for this order."}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <aside className="order-detail-side-column">
          <Card className="order-detail-card">
            <CardHeader className="order-section-heading">
              <div>
                <p className="eyebrow">CUSTOMER</p>
                <CardTitle>Contact & payment</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="order-customer-summary">
              <span className="order-customer-large-avatar">
                {(order.customer_name || "C").trim().slice(0, 1).toUpperCase()}
              </span>
              <strong>{order.customer_name || "Customer"}</strong>
              <span className="order-customer-meta">Customer account</span>
              <Separator />
              <div className="order-detail-info-row">
                <UserRound size={15} />
                <span>{order.customer_name || "Customer"}</span>
              </div>
              <div className="order-detail-info-row">
                <MapPin size={15} />
                <span>
                  {address ||
                    (destination
                      ? `${destination[0].toFixed(5)}, ${destination[1].toFixed(5)}`
                      : "Address unavailable")}
                </span>
              </div>
              <div className="order-detail-info-row">
                <ReceiptText size={15} />
                <span>
                  Payment{" "}
                  <strong className="capitalize">
                    {order.payment_status || "Pending"}
                  </strong>
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="order-detail-card order-restaurant-card">
            <CardContent>
              <span className="order-stat-icon">
                <Store size={16} />
              </span>
              <div>
                <small>Prepared by</small>
                <strong>{order.restaurant_name || "Restaurant"}</strong>
              </div>
            </CardContent>
          </Card>
          <Card className="order-next-action-card">
            <CardContent>
              {terminal ? (
                <>
                  <CheckCircle2 size={20} />
                  <strong>
                    Order {ORDER_STATUS_LABEL[order.status].toLowerCase()}
                  </strong>
                  <span>This order has reached its final status.</span>
                </>
              ) : (
                <>
                  <span className="eyebrow">NEXT STEP</span>
                  <strong>
                    {next ? ORDER_STATUS_LABEL[next] : "Review order"}
                  </strong>
                  <span>
                    Update the status as the order moves through fulfillment.
                  </span>
                  {next && (
                    <Button
                      onClick={() => advance.mutate({ next })}
                      disabled={advance.isPending}
                    >
                      {advance.isPending ? (
                        <Loader2 className="animate-spin" size={15} />
                      ) : (
                        <CheckCircle2 size={15} />
                      )}
                      Mark {ORDER_STATUS_LABEL[next]}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function BillRow({
  label,
  value,
  highlight = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight ? "order-bill-row order-bill-total" : "order-bill-row"
      }
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
