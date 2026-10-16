import { useEffect, useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Bike,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Search,
  Truck,
  UserRoundPlus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api";
import { completeDelivery, listDeliveries } from "@/services/deliveryService";
import {
  DELIVERY_STATUSES,
  DELIVERY_STATUS_LABEL,
  type Delivery,
  type DeliveryStatus,
} from "@/types/delivery";
import { DeliveryStatusBadge } from "@/components/delivery/DeliveryStatusBadge";
import { AssignDriverDialog } from "@/components/delivery/AssignDriverDialog";

const PAGE_SIZE = 20;
type DeliveryFilter = DeliveryStatus | "all";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function Deliveries() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<DeliveryFilter>("all");
  const [page, setPage] = useState(1);
  const [assignTarget, setAssignTarget] = useState<Delivery | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  const query = useQuery({
    queryKey: ["deliveries", { page, search: debouncedSearch, status }],
    queryFn: () => listDeliveries({ page, search: debouncedSearch, status }),
    placeholderData: keepPreviousData,
  });

  const completeMutation = useMutation({
    mutationFn: completeDelivery,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Delivery completed" });
    },
    onError: (err) =>
      toast({
        title: "Couldn't complete delivery",
        description: extractApiError(err),
        variant: "destructive",
      }),
  });

  const deliveries = query.data?.results ?? [];
  const active = deliveries.filter(
    (delivery) => !["delivered", "cancelled"].includes(delivery.status),
  ).length;
  const unassigned = deliveries.filter(
    (delivery) => !delivery.courier && delivery.status === "pending",
  ).length;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((query.data?.count ?? 0) / PAGE_SIZE)),
    [query.data?.count],
  );
  const hasFilters = search.trim().length > 0 || status !== "all";

  return (
    <div className="page-stack max-w-7xl deliveries-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">FULFILMENT</p>
          <h1>Deliveries</h1>
          <p>Assign couriers and keep every handoff moving.</p>
        </div>
        {query.isFetching && (
          <span className="delivery-query-status" role="status">
            <Loader2 size={14} className="animate-spin" /> Updating results
          </span>
        )}
      </header>

      <section className="metric-strip">
        <div className="metric-tile">
          <span className="metric-icon">
            <Truck size={17} />
          </span>
          <div>
            <small>Active on this page</small>
            <strong>{active}</strong>
          </div>
        </div>
        <div className="metric-tile">
          <span className="metric-icon metric-icon-warm">
            <UserRoundPlus size={17} />
          </span>
          <div>
            <small>Awaiting courier</small>
            <strong>{unassigned}</strong>
          </div>
        </div>
        <div className="metric-tile">
          <span className="metric-icon">
            <Bike size={17} />
          </span>
          <div>
            <small>Matching deliveries</small>
            <strong>{query.data?.count ?? 0}</strong>
          </div>
        </div>
      </section>

      <Card className="filter-panel deliveries-filter-panel">
        <div className="delivery-search-field">
          <Search size={16} aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Order #, courier name or phone"
            aria-label="Search by order number, courier name or phone"
            autoComplete="off"
          />
        </div>
        <div className="delivery-filter-options">
          <Tabs
            className="delivery-tabs-root"
            value={status}
            onValueChange={(value) => {
              setStatus(value as DeliveryFilter);
              setPage(1);
            }}
          >
            <TabsList
              className="delivery-status-tabs"
              aria-label="Filter deliveries by status"
            >
              <TabsTrigger value="all">All</TabsTrigger>
              {DELIVERY_STATUSES.map((deliveryStatus) => (
                <TabsTrigger key={deliveryStatus} value={deliveryStatus}>
                  {DELIVERY_STATUS_LABEL[deliveryStatus]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="delivery-clear-filters"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setStatus("all");
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      <Card className="table-card">
        {query.isLoading ? (
          <div
            className="delivery-loading-rows"
            aria-label="Loading deliveries"
          >
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="empty-state text-destructive">
            {extractApiError(query.error)}
          </div>
        ) : deliveries.length === 0 ? (
          <div className="empty-state">
            <Truck size={25} />
            <strong>
              {hasFilters
                ? "No deliveries match these filters"
                : "No delivery requests yet"}
            </strong>
            <span>
              {hasFilters
                ? "Try another order number, courier name, phone or status."
                : "Delivery requests are created when an order is accepted."}
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Courier</TableHead>
                  <TableHead>Drop-off</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => {
                  const canComplete = [
                    "accepted",
                    "picked_up",
                    "assigned",
                  ].includes(delivery.status);
                  const coords = delivery.dropoff_coords;
                  const location =
                    typeof delivery.order?.dropoff_location === "string"
                      ? delivery.order.dropoff_location
                      : coords
                        ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
                        : "Location unavailable";
                  return (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <strong>#{delivery.order?.id ?? "—"}</strong>
                        <span className="table-subline">
                          {formatDate(delivery.order?.placed_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {delivery.courier_name ? (
                          <>
                            <strong>{delivery.courier_name}</strong>
                            <span className="table-subline">
                              {delivery.courier_phone || "Courier assigned"}
                            </span>
                          </>
                        ) : (
                          <span className="muted-inline">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <span className="flex items-center gap-1.5 min-w-0" title={location}>
                          <MapPin size={13} className="shrink-0" />
                          <span className="truncate">{location}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <DeliveryStatusBadge status={delivery.status} />
                      </TableCell>
                      <TableCell>{formatDate(delivery.updated_at)}</TableCell>
                      <TableCell className="text-left">
                        <div className="inline-flex gap-2">
                          {["pending", "assigned"].includes(delivery.status) && (
                            <IconButton
                              variant="outline"
                              size="sm"
                              label={delivery.courier ? "Reassign courier" : "Assign courier"}
                              onClick={() => setAssignTarget(delivery)}
                              className="border-0"
                            >
                              <UserRoundPlus size={14} />
                            </IconButton>
                          )}
                          {canComplete && (
                            <Button
                              size="sm"
                              onClick={() =>
                                completeMutation.mutate(delivery.id)
                              }
                              disabled={completeMutation.isPending}
                            >
                              <Check size={14} />
                              Mark delivered
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {query.data && query.data.count > 0 && (
        <div className="delivery-pagination">
          <span>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, query.data.count)}–
            {Math.min(page * PAGE_SIZE, query.data.count)} of {query.data.count}
          </span>
          <div className="delivery-pagination-controls">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={!query.data.previous || query.isFetching}
            >
              <ChevronLeft size={15} />
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => current + 1)}
              disabled={!query.data.next || query.isFetching}
            >
              Next
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      )}

      <AssignDriverDialog
        open={!!assignTarget}
        onOpenChange={(open) => !open && setAssignTarget(null)}
        delivery={assignTarget}
      />
    </div>
  );
}
