import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MapPin, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { acceptOrder, getOrder, updateOrderStatus } from "@/services/ordersService";
import { NEXT_STATUS, ORDER_STATUS_LABEL, type Order, type OrderStatus } from "@/types/orders";
import { extractApiError } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

function money(v: number | string | undefined | null) {
  if (v == null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
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
      if (order.status === "placed" && next === "accepted") return acceptOrder(order.id);
      return updateOrderStatus(order.id, next);
    },
    onSuccess: (data) => {
      qc.setQueryData(["order", id], data);
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Status updated", description: `Order #${data.id} → ${ORDER_STATUS_LABEL[data.status]}` });
    },
    onError: (err) => toast({ title: "Update failed", description: extractApiError(err), variant: "destructive" }),
  });

  const cancel = useMutation({
    mutationFn: () => updateOrderStatus(orderQ.data!.id, "cancelled"),
    onSuccess: (data) => {
      qc.setQueryData(["order", id], data);
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Order cancelled" });
    },
    onError: (err) => toast({ title: "Cancel failed", description: extractApiError(err), variant: "destructive" }),
  });

  if (orderQ.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (orderQ.isError || !orderQ.data) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/orders")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-sm text-destructive">
            {orderQ.isError ? extractApiError(orderQ.error) : "Order not found."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const order: Order = orderQ.data;
  const next = NEXT_STATUS[order.status];
  const terminal = order.status === "delivered" || order.status === "cancelled";

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/orders">
              <ArrowLeft className="h-4 w-4" /> Orders
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Order #{order.id}</h1>
            <p className="text-sm text-muted-foreground">Placed {new Date(order.placed_at).toLocaleString()}</p>
          </div>
        </div>
        <OrderStatusBadge status={order.status} className="text-sm px-3 py-1" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-medium">Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.map((it) => (
              <div key={it.id} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.menu_item?.name ?? `Item #${it.menu_item?.id}`}</div>
                  <div className="text-sm text-muted-foreground">
                    {it.qty} × {money(it.unit_price)}
                    {it.promotion ? <span className="ml-2 text-success">{it.promotion.name}</span> : null}
                  </div>
                </div>
                <div className="font-medium">{money(Number(it.unit_price) * it.qty)}</div>
              </div>
            ))}
            <Separator />
            <div className="space-y-1 text-sm">
              <Row label="Subtotal" value={money(order.total_price)} />
              {order.delivery_fee && <Row label="Delivery" value={money(order.delivery_fee)} />}
              {order.tax && <Row label="Tax" value={money(order.tax)} />}
              {order.total_discount > 0 && <Row label="Discount" value={`- ${money(order.total_discount)}`} />}
              <Separator className="my-2" />
              <Row label={<span className="font-semibold">Total</span>} value={<span className="font-semibold">{money(order.total_amount)}</span>} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Customer #{order.customer}</span>
              </div>
              {order.dropoff_location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">{order.dropoff_location}</span>
                </div>
              )}
              {order.payment_status && (
                <div className="text-muted-foreground">
                  Payment: <span className="capitalize text-foreground">{order.payment_status}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {terminal ? (
                <p className="text-sm text-muted-foreground">This order is {order.status}. No further actions.</p>
              ) : (
                <>
                  {next && (
                    <Button
                      className="w-full"
                      onClick={() => advance.mutate({ next })}
                      disabled={advance.isPending}
                    >
                      {advance.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Mark as ${ORDER_STATUS_LABEL[next]}`}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => cancel.mutate()}
                    disabled={cancel.isPending}
                  >
                    {cancel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel order"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
