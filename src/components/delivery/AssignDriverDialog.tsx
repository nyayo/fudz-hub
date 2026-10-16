import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api";
import { assignCourier, listAvailableCouriers } from "@/services/deliveryService";
import type { Delivery } from "@/types/delivery";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  delivery: Delivery | null;
}

export function AssignDriverDialog({ open, onOpenChange, delivery }: Props) {
  const qc = useQueryClient();
  const [courierId, setCourierId] = useState("");
  const couriersQ = useQuery({ queryKey: ["available-couriers"], queryFn: listAvailableCouriers, enabled: open });
  
  useEffect(() => {
    if (!open) setCourierId("");
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => assignCourier(delivery!.id, Number(courierId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      qc.invalidateQueries({ queryKey: ["available-couriers"] });
      toast({ title: "Courier assigned" });
      onOpenChange(false);
    },
    onError: (err) =>
      toast({ title: "Error", description: extractApiError(err), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign driver</DialogTitle>
          <DialogDescription>Choose an approved courier who is currently available.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <p className="text-sm text-muted-foreground">Choose an approved courier who is currently available.</p>
          <Select value={courierId} onValueChange={setCourierId}>
            <SelectTrigger><SelectValue placeholder={couriersQ.isLoading ? "Loading couriers…" : "Select a courier"} /></SelectTrigger>
            <SelectContent>{couriersQ.data?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name} · {c.vehicle_type} · ★ {Number(c.rating).toFixed(1)}</SelectItem>)}</SelectContent>
          </Select>
          {couriersQ.isError && <p className="text-sm text-destructive">{extractApiError(couriersQ.error)}</p>}
          {!couriersQ.isLoading && !couriersQ.data?.length && !couriersQ.isError && <p className="text-sm text-muted-foreground">No available couriers right now.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!courierId || mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
