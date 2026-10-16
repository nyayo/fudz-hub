import { useEffect, useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api";
import {
  createMenuItem,
  listCategories,
  updateMenuItem,
} from "@/services/menuService";
import { uploadMenuItemImage } from "@/services/restaurantService";
import type { MenuItem, MenuItemPayload } from "@/types/menu";
import { Upload } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item?: MenuItem | null;
  restaurantId?: number;
}

const empty: MenuItemPayload = {
  title: "",
  description: "",
  category: 0,
  price: "",
  is_available: true,
  is_featured: false,
  prep_time_minutes: null,
  allergens: "",
};

export function MenuItemDialog({ open, onOpenChange, item, restaurantId }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<MenuItemPayload>(empty);
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories", "all", restaurantId],
    queryFn: () => listCategories({ restaurant_id: restaurantId }),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setForm(
        item
          ? {
              title: item.title,
              description: item.description,
              category: item.category,
              price: item.price,
              is_available: item.is_available,
              is_featured: item.is_featured,
              prep_time_minutes: item.prep_time_minutes,
              allergens: item.allergens,
            }
          : empty,
      );
    }
  }, [open, item]);

  const mutation = useMutation({
    mutationFn: () =>
      item ? updateMenuItem(item.id, form) : createMenuItem(restaurantId ? { ...form, restaurant: restaurantId } : form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      toast({ title: item ? "Item updated" : "Item created" });
      onOpenChange(false);
    },
    onError: (err) =>
      toast({ title: "Error", description: extractApiError(err), variant: "destructive" }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadMenuItemImage(item!.id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      toast({ title: "Image uploaded" });
    },
    onError: (err) =>
      toast({ title: "Upload failed", description: extractApiError(err), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Edit menu item" : "New menu item"}</DialogTitle>
          <DialogDescription>Fill in the details below.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={form.category ? String(form.category) : ""}
                onValueChange={(v) => setForm({ ...form, category: Number(v) })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.results.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="prep">Prep time (min)</Label>
              <Input
                id="prep"
                type="number"
                value={form.prep_time_minutes ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    prep_time_minutes: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="allergens">Allergens</Label>
              <Input
                id="allergens"
                value={form.allergens ?? ""}
                onChange={(e) => setForm({ ...form, allergens: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Available</Label>
              <p className="text-xs text-muted-foreground">Show on customer menu</p>
            </div>
            <Switch
              checked={form.is_available}
              onCheckedChange={(v) => setForm({ ...form, is_available: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Featured</Label>
              <p className="text-xs text-muted-foreground">Highlight as a featured item</p>
            </div>
            <Switch
              checked={form.is_featured}
              onCheckedChange={(v) => setForm({ ...form, is_featured: v })}
            />
          </div>
          {item && (
            <div className="space-y-2">
              <Label>Images</Label>
              <div className="flex items-center gap-3 flex-wrap">
                {item.images?.map((img) => (
                  <div key={img.id} className="h-16 w-16 overflow-hidden rounded-md border bg-muted">
                    <img src={img.image} alt={item.title} className="menu-item-image h-full w-full object-cover" />
                  </div>
                ))}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadMutation.mutate(f);
                    e.target.value = "";
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={uploadMutation.isPending}>
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadMutation.isPending ? "Uploading..." : "Add image"}
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title || !form.category || !form.price}
          >
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
