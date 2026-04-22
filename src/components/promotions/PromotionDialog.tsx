import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  createPromotion,
  getPromotionMenuItems,
  updatePromotion,
} from "@/services/restaurantService";
import { setMenuItemPromotions, listMenuItems } from "@/services/menuService";
import type { Promotion, PromotionPayload } from "@/types/restaurant";
import { MenuItemMultiSelect } from "./MenuItemMultiSelect";

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
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [initialItemIds, setInitialItemIds] = useState<number[]>([]);

  // Load currently-attached items when editing.
  const attachedQ = useQuery({
    queryKey: ["promotion-items", promotion?.id],
    queryFn: () => getPromotionMenuItems(promotion!.id),
    enabled: open && !!promotion,
  });

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
      if (!promotion) {
        setSelectedItemIds([]);
        setInitialItemIds([]);
      }
    }
  }, [open, promotion]);

  useEffect(() => {
    if (attachedQ.data) {
      const ids = attachedQ.data.map((i) => i.id);
      setInitialItemIds(ids);
      setSelectedItemIds(ids);
    }
  }, [attachedQ.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : "",
        end_date: form.end_date ? new Date(form.end_date).toISOString() : "",
        ...(restaurantId && !promotion ? { restaurant: restaurantId } : {}),
      };
      const saved = promotion
        ? await updatePromotion(promotion.id, payload)
        : await createPromotion(payload);

      // Reconcile menu item attachments via each item's promotion_ids.
      const promoId = saved.id;
      const wanted = new Set(selectedItemIds);
      const had = new Set(initialItemIds);
      const toAdd = [...wanted].filter((id) => !had.has(id));
      const toRemove = [...had].filter((id) => !wanted.has(id));

      if (toAdd.length || toRemove.length) {
        // Need each item's existing promotion_ids to merge correctly.
        const allItems = await listMenuItems({ page: 1 });
        const byId = new Map(allItems.results.map((i) => [i.id, i]));
        const tasks: Promise<unknown>[] = [];
        for (const id of toAdd) {
          const item = byId.get(id);
          const current = item?.promotions?.map((p) => p.id) ?? [];
          tasks.push(setMenuItemPromotions(id, Array.from(new Set([...current, promoId]))));
        }
        for (const id of toRemove) {
          const item = byId.get(id);
          const current = item?.promotions?.map((p) => p.id) ?? [];
          tasks.push(setMenuItemPromotions(id, current.filter((p) => p !== promoId)));
        }
        await Promise.allSettled(tasks);
      }
      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotions"] });
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      qc.invalidateQueries({ queryKey: ["promotion-items"] });
      toast({ title: promotion ? "Promotion updated" : "Promotion created" });
      onOpenChange(false);
    },
    onError: (err) =>
      toast({ title: "Error", description: extractApiError(err), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

          <div className="grid gap-2">
            <Label>Menu items on promotion</Label>
            <MenuItemMultiSelect
              selectedIds={selectedItemIds}
              onChange={setSelectedItemIds}
              disabled={mutation.isPending || (!!promotion && attachedQ.isLoading)}
            />
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
