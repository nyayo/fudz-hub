import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api";
import {
  listDeliveries, updateDeliveryStatus,
} from "@/services/deliveryService";
import {
  DELIVERY_STATUSES, DELIVERY_STATUS_LABEL, NEXT_DELIVERY_STATUS,
  type Delivery, type DeliveryStatus,
} from "@/types/delivery";
import { DeliveryStatusBadge } from "@/components/delivery/DeliveryStatusBadge";
import { AssignDriverDialog } from "@/components/delivery/AssignDriverDialog";
import { Search, UserPlus } from "lucide-react";

export default function Deliveries() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DeliveryStatus | "all">("all");
  const [assignTarget, setAssignTarget] = useState<Delivery | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["deliveries", search, status],
    queryFn: () => listDeliveries({ search, status }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: number; next: DeliveryStatus }) => updateDeliveryStatus(id, next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      toast({ title: "Status updated" });
    },
    onError: (err) =>
      toast({ title: "Error", description: extractApiError(err), variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Deliveries</h1>
        <p className="text-muted-foreground">Track and manage outgoing orders.</p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search deliveries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={status} onValueChange={(v) => setStatus(v as DeliveryStatus | "all")}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            {DELIVERY_STATUSES.map((s) => (
              <TabsTrigger key={s} value={s}>{DELIVERY_STATUS_LABEL[s]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !data?.results.length ? (
          <div className="p-12 text-center text-muted-foreground">No deliveries found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Dropoff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.results.map((d) => {
                const next = NEXT_DELIVERY_STATUS[d.status];
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">#{d.order ?? d.order_id}</TableCell>
                    <TableCell>
                      {d.driver_name ? (
                        <div className="text-sm">
                          <div>{d.driver_name}</div>
                          {d.driver_phone && <div className="text-muted-foreground text-xs">{d.driver_phone}</div>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {d.dropoff_location ?? "—"}
                    </TableCell>
                    <TableCell><DeliveryStatusBadge status={d.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(d.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => setAssignTarget(d)}>
                        <UserPlus className="mr-1 h-4 w-4" />
                        {d.driver_name ? "Reassign" : "Assign"}
                      </Button>
                      {next && (
                        <Button
                          size="sm"
                          onClick={() => statusMutation.mutate({ id: d.id, next })}
                          disabled={statusMutation.isPending}
                        >
                          Mark {DELIVERY_STATUS_LABEL[next]}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <AssignDriverDialog
        open={!!assignTarget}
        onOpenChange={(v) => !v && setAssignTarget(null)}
        delivery={assignTarget}
      />
    </div>
  );
}
