import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function Orders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["orders", { page, status, search }],
    queryFn: () => listOrders({ page, status, search }),
    placeholderData: keepPreviousData,
  });

  const totalPages = useMemo(() => {
    const c = query.data?.count ?? 0;
    return Math.max(1, Math.ceil(c / PAGE_SIZE));
  }, [query.data?.count]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">Track and manage incoming orders.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by order #, customer…"
            className="pl-9"
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
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          {ORDER_STATUSES.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s.replace("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-medium">
            {query.data?.count ?? 0} order{(query.data?.count ?? 0) === 1 ? "" : "s"}
          </CardTitle>
          {query.isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent className="p-0">
          {query.isError ? (
            <div className="p-8 text-center text-sm text-destructive">{extractApiError(query.error)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : query.data && query.data.results.length > 0 ? (
                  query.data.results.map((o) => {
                    const itemCount = o.items?.reduce((sum, it) => sum + (it.qty ?? 0), 0) ?? 0;
                    return (
                      <TableRow key={o.id} className="cursor-pointer">
                        <TableCell className="font-medium">#{o.id}</TableCell>
                        <TableCell className="text-muted-foreground">Customer #{o.customer}</TableCell>
                        <TableCell>{itemCount}</TableCell>
                        <TableCell className="font-medium">{formatMoney(o.total_amount ?? o.total_price)}</TableCell>
                        <TableCell>
                          <OrderStatusBadge status={o.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(o.placed_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/orders/${o.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">
                      No orders found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || query.isFetching}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!query.data?.next || query.isFetching}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
