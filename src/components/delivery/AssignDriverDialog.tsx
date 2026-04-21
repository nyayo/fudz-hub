import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api";
import { assignDriver } from "@/services/deliveryService";
import type { Delivery } from "@/types/delivery";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  delivery: Delivery | null;
}

export function AssignDriverDialog({ open, onOpenChange, delivery }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (open && delivery) {
      setName(delivery.driver_name ?? "");
      setPhone(delivery.driver_phone ?? "");
    }
  }, [open, delivery]);

  const mutation = useMutation({
    mutationFn: () => assignDriver(delivery!.id, name, phone),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      toast({ title: "Driver assigned" });
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
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="dname">Driver name</Label>
            <Input id="dname" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dphone">Phone</Label>
            <Input id="dphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!name || mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
