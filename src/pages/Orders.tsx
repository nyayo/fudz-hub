import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  ImageOff,
  ArrowUpRight,
  ShoppingBag,
  Clock3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { listOrders } from "@/services/ordersService";
import { ORDER_STATUSES, type OrderStatus } from "@/types/orders";
import { extractApiError } from "@/lib/api";

const PAGE_SIZE = 10;
type Filter = OrderStatus | "all";

function formatMoney(v: number | string | undefined) {
  if (v == null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "UGX" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Orders() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Filter>("all");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
    setPage(1);
  }, [searchParams]);

  const query = useQuery({
    queryKey: ["orders", { page, status, search }],
    queryFn: () => listOrders({ page, status, search }),
    placeholderData: keepPreviousData,
  });
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((query.data?.count ?? 0) / PAGE_SIZE)),
    [query.data?.count],
  );

  return (
    <div className="page-stack max-w-7xl orders-page">
      <div className="orders-heading-row">
        <div>
          <p className="eyebrow">SERVICE OVERVIEW</p>
          <h1>Orders</h1>
          <p>
            Track incoming orders, customer details, and fulfillment status.
          </p>
        </div>
        <div className="orders-search">
          <Search className="h-4 w-4" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search order or customer…"
            aria-label="Search orders"
          />
        </div>
      </div>
      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v as Filter);
          setPage(1);
        }}
      >
        <TabsList className="orders-status-tabs">
          <TabsTrigger value="all">All orders</TabsTrigger>
          {ORDER_STATUSES.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s.replace("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Card className="orders-table-card">
        <CardHeader className="orders-table-header">
          <div>
            <p className="eyebrow">LIVE QUEUE</p>
            <CardTitle>
              {query.data?.count ?? 0} order
              {(query.data?.count ?? 0) === 1 ? "" : "s"}
            </CardTitle>
          </div>
          {query.isFetching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent className="p-0">
          {query.isError ? (
            <div className="p-8 text-center text-sm text-destructive">
              {extractApiError(query.error)}
            </div>
          ) : (
            <div className="orders-table-scroll">
              <Table className="orders-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>First item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Placed</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.isLoading ? (
                    Array.from({ length: 5 }, (_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }, (__, j) => (
                          <TableCell key={j}>
                            <div className="h-10 rounded-lg bg-muted animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : query.data && query.data.results.length > 0 ? (
                    query.data.results.map((o) => {
                      const itemCount =
                        o.items?.reduce((sum, it) => sum + (it.qty ?? 0), 0) ??
                        0;
                      const item = o.items?.[0]?.menu_item;
                      const image = item?.images?.[0]?.image ?? item?.image;
                      const itemName = item?.name || item?.title || "Menu item";
                      return (
                        <TableRow key={o.id} className="orders-table-row">
                          <TableCell>
                            <Link
                              className="order-number-link"
                              to={`/orders/${o.id}`}
                            >
                              <span className="order-number-icon">
                                <ShoppingBag size={15} />
                              </span>
                              <span>
                                <strong>#{o.id}</strong>
                                <small>Open order</small>
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="order-customer-cell">
                              <span className="order-customer-avatar">
                                {(o.customer_name || "C")
                                  .trim()
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                              <span>
                                <strong>{o.customer_name || "Customer"}</strong>
                                <small>Customer</small>
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="order-item-cell">
                              {image ? (
                                <img
                                  src={image}
                                  alt={itemName}
                                  className="menu-item-image order-item-thumb"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="menu-item-image order-item-thumb order-item-empty">
                                  <ImageOff size={16} />
                                </span>
                              )}
                              <span>
                                <strong>{itemName}</strong>
                                <small>
                                  {o.items?.length > 1
                                    ? `+ ${o.items.length - 1} more item${o.items.length === 2 ? "" : "s"}`
                                    : "First item"}
                                </small>
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="order-quantity-pill">
                              {itemCount} items
                            </span>
                          </TableCell>
                          <TableCell>
                            <strong className="order-total-value">
                              {formatMoney(o.total_amount ?? o.total_price)}
                            </strong>
                          </TableCell>
                          <TableCell>
                            <OrderStatusBadge status={o.status} />
                          </TableCell>
                          <TableCell>
                            <div className="order-date-cell">
                              <Clock3 size={13} />
                              <span>{formatDate(o.placed_at)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <IconButton asChild label={`View order #${o.id}`}>
                              <Link to={`/orders/${o.id}`}>
                                <ArrowUpRight size={16} />
                              </Link>
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-14 text-center text-sm text-muted-foreground"
                      >
                        No orders found for these filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || query.isFetching}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!query.data?.next || query.isFetching}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
