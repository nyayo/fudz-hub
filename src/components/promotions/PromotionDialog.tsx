import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api";
import { createPromotion, getPromotionMenuItems, updatePromotion } from "@/services/restaurantService";
import { setMenuItemPromotions, listMenuItems } from "@/services/menuService";
import type { Promotion, PromotionPayload } from "@/types/restaurant";
import { MenuItemMultiSelect } from "./MenuItemMultiSelect";

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
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
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function PromotionDialog({ open, onOpenChange, promotion, restaurantId }: Props) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<PromotionPayload>(empty);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [initialItemIds, setInitialItemIds] = useState<number[]>([]);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState("");

  const attachedQuery = useQuery({
    queryKey: ["promotion-items", promotion?.id],
    queryFn: () => getPromotionMenuItems(promotion!.id),
    enabled: open && !!promotion,
  });

  useEffect(() => {
    if (!open) return;
    setForm(promotion ? {
      name: promotion.name,
      description: promotion.description,
      discount: promotion.discount ?? 0,
      start_date: toLocalInput(promotion.start_date),
      end_date: toLocalInput(promotion.end_date),
      is_active: promotion.is_active,
    } : empty);
    setBannerFile(null);
    setBannerPreview(promotion?.banner ?? null);
    setBannerError("");
    if (!promotion) {
      setSelectedItemIds([]);
      setInitialItemIds([]);
    }
  }, [open, promotion]);

  useEffect(() => {
    if (!bannerFile) return;
    const objectUrl = URL.createObjectURL(bannerFile);
    setBannerPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [bannerFile]);

  useEffect(() => {
    if (!attachedQuery.data) return;
    const ids = attachedQuery.data.map((item) => item.id);
    setInitialItemIds(ids);
    setSelectedItemIds(ids);
  }, [attachedQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : "",
        end_date: form.end_date ? new Date(form.end_date).toISOString() : "",
        ...(restaurantId && !promotion ? { restaurant: restaurantId } : {}),
      };
      const saved = promotion
        ? await updatePromotion(promotion.id, payload, bannerFile ?? undefined)
        : await createPromotion(payload, bannerFile ?? undefined);

      const wanted = new Set(selectedItemIds);
      const had = new Set(initialItemIds);
      const toAdd = [...wanted].filter((id) => !had.has(id));
      const toRemove = [...had].filter((id) => !wanted.has(id));
      if (toAdd.length || toRemove.length) {
        const allItems = await listMenuItems({ page: 1, restaurant_id: restaurantId });
        const byId = new Map(allItems.results.map((item) => [item.id, item]));
        const tasks: Promise<unknown>[] = [];
        for (const id of toAdd) {
          const item = byId.get(id);
          const current = item?.promotions?.map((entry) => entry.id) ?? [];
          tasks.push(setMenuItemPromotions(id, Array.from(new Set([...current, saved.id]))));
        }
        for (const id of toRemove) {
          const item = byId.get(id);
          const current = item?.promotions?.map((entry) => entry.id) ?? [];
          tasks.push(setMenuItemPromotions(id, current.filter((id) => id !== saved.id)));
        }
        await Promise.allSettled(tasks);
      }
      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["promotion-items"] });
      toast({ title: promotion ? "Promotion updated" : "Promotion created" });
      onOpenChange(false);
    },
    onError: (error) => toast({ title: "Couldn't save promotion", description: extractApiError(error), variant: "destructive" }),
  });

  const handleBanner = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setBannerError("Choose an image file such as JPG, PNG, or WebP.");
      return;
    }
    if (file.size > 5_000 * 1024) {
      setBannerError("This image is larger than 5 MB. Choose a smaller file.");
      return;
    }
    setBannerError("");
    setBannerFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="promotion-dialog-content w-[calc(100vw-2rem)] max-w-4xl">
        <DialogHeader className="promotion-dialog-header">
          <DialogTitle>{promotion ? "Edit promotion" : "Create a promotion"}</DialogTitle>
          <DialogDescription>Shape the offer, choose its menu items, and give the campaign a visual.</DialogDescription>
        </DialogHeader>

        <div className="promotion-editor-grid py-2">
          <div className="promotion-fields">
            <div className="auth-field"><Label htmlFor="promotion-name">Campaign name</Label><Input id="promotion-name" value={form.name} placeholder="Weekend lunch special" onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
            <div className="auth-field"><Label htmlFor="promotion-description">Description</Label><Textarea id="promotion-description" rows={3} value={form.description} placeholder="A short note customers will see" onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="auth-field"><Label htmlFor="promotion-discount">Discount (%)</Label><Input id="promotion-discount" type="number" min={0} max={100} value={form.discount} onChange={(event) => setForm({ ...form, discount: Number(event.target.value) })} /></div>
              <div className="auth-field"><Label htmlFor="promotion-active">Visibility</Label><div className="promotion-visibility"><span>{form.is_active ? "Enabled" : "Paused"}</span><Switch id="promotion-active" checked={form.is_active} onCheckedChange={(value) => setForm({ ...form, is_active: value })} /></div></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="auth-field"><Label htmlFor="promotion-start">Starts</Label><Input id="promotion-start" type="datetime-local" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} /></div>
              <div className="auth-field"><Label htmlFor="promotion-end">Ends</Label><Input id="promotion-end" type="datetime-local" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} /></div>
            </div>
            <div className="auth-field"><Label>Menu items in this offer</Label><MenuItemMultiSelect selectedIds={selectedItemIds} onChange={setSelectedItemIds} restaurantId={restaurantId} disabled={mutation.isPending || (!!promotion && attachedQuery.isLoading)} /></div>
          </div>

          <div className="promotion-banner-field">
            <Label htmlFor="promotion-banner">Campaign image</Label>
            <input ref={fileInput} id="promotion-banner" type="file" accept="image/*" hidden onChange={(event) => { handleBanner(event.target.files?.[0]); event.target.value = ""; }} />
            <div className="promotion-banner-preview">
              {bannerPreview ? <img src={bannerPreview} alt={bannerFile?.name || `${promotion?.name || form.name || "Promotion"} banner preview`} /> : (
                <div className="promotion-banner-placeholder"><ImagePlus size={23} /><strong>Add a campaign image</strong><small>Make the offer recognizable in the restaurant app.</small></div>
              )}
            </div>
            <div className="promotion-banner-actions">
              <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}><Upload size={15} />{bannerPreview ? "Replace image" : "Choose image"}</Button>
              {bannerFile && <Button type="button" variant="ghost" size="icon" aria-label="Remove selected image" onClick={() => { setBannerFile(null); setBannerPreview(promotion?.banner ?? null); setBannerError(""); }}><X size={15} /></Button>}
            </div>
            <p className="promotion-banner-help">JPG, PNG, or WebP · up to 5 MB. Existing artwork is kept unless replaced.</p>
            {bannerError && <p className="text-xs text-destructive" role="alert">{bannerError}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name.trim() || !form.start_date || !form.end_date}>
            {mutation.isPending ? "Saving…" : promotion ? "Save changes" : "Create campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
