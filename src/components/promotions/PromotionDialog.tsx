import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api";
import { createPromotion, updatePromotion } from "@/services/restaurantService";
import type { Promotion, PromotionPayload } from "@/types/restaurant";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  promotion?: Promotion | null;
  restaurantId?: number;
}

const empty: PromotionPayload = {
  name: "",
  description: "",
  discount: 10,
  start_date: "",
  end_date: "",
  is_active: true,
};

function toLocalInput(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PromotionDialog({ open, onOpenChange, promotion, restaurantId }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<PromotionPayload>(empty);

  useEffect(() => {
    if (open) {
      setForm(
        promotion
          ? {
              name: promotion.name,
              description: promotion.description,
              discount: promotion.discount ?? 0,
              start_date: toLocalInput(promotion.start_date),
              end_date: toLocalInput(promotion.end_date),
              is_active: promotion.is_active,
            }
          : empty,
      );
    }
  }, [open, promotion]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : "",
        end_date: form.end_date ? new Date(form.end_date).toISOString() : "",
        ...(restaurantId && !promotion ? { restaurant: restaurantId } : {}),
      };
      return promotion ? updatePromotion(promotion.id, payload) : createPromotion(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotions"] });
      toast({ title: promotion ? "Promotion updated" : "Promotion created" });
      onOpenChange(false);
    },
    onError: (err) =>
      toast({ title: "Error", description: extractApiError(err), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{promotion ? "Edit promotion" : "New promotion"}</DialogTitle>
          <DialogDescription>Run a limited-time discount on your menu.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="pname">Name</Label>
            <Input id="pname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pdesc">Description</Label>
            <Textarea
              id="pdesc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="discount">Discount (%)</Label>
            <Input
              id="discount"
              type="number"
              min={0}
              max={100}
              value={form.discount}
              onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start">Start</Label>
              <Input
                id="start"
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end">End</Label>
              <Input
                id="end"
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Enable this promotion</p>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name || !form.start_date || !form.end_date}
          >
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
