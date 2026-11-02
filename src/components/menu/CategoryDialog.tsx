import { FieldError, FormError } from "@/components/workspace/FormFeedback";
import { apiFieldErrors, focusApiError } from "@/lib/form-errors";
import { useEffect, useRef, useState } from "react";
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
import { createCategory, updateCategory } from "@/services/menuService";
import { uploadCategoryImage } from "@/services/restaurantService";
import type { Category, CategoryPayload } from "@/types/menu";
import { Upload } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category?: Category | null;
  restaurantId?: number;
}

const empty: CategoryPayload = { name: "", description: "", position: 0, is_active: true };

export function CategoryDialog({ open, onOpenChange, category, restaurantId }: Props) {
  const qc = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<CategoryPayload>(empty);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(
        category
          ? {
              name: category.name,
              description: category.description,
              position: category.position,
              is_active: category.is_active,
            }
          : empty,
      );
    }
  }, [open, category]);

  const mutation = useMutation({
    mutationFn: () =>
      category ? updateCategory(category.id, form, restaurantId) : createCategory(form, restaurantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: category ? "Category updated" : "Category created" });
      onOpenChange(false);
    },
    onError: (err) => {
      focusApiError(err, formRef.current);
      toast({ title: "Check the form", description: extractApiError(err), variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadCategoryImage(category!.id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Image uploaded" });
    },
    onError: (err) =>
      toast({ title: "Upload failed", description: extractApiError(err), variant: "destructive" }),
  });

  const fieldErrors = apiFieldErrors(mutation.error);

  return (
    <Dialog open={open} onOpenChange={value => { if (!mutation.isPending) { if (!value) mutation.reset(); onOpenChange(value); } }}>
      <DialogContent className="max-w-md">
        <form ref={formRef} className="dialog-form" onSubmit={event => { event.preventDefault(); mutation.mutate(); }}>
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>Group menu items so customers can find them easily.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name" name="name" required aria-invalid={!!fieldErrors.name} aria-describedby="category-name-error"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            /><FieldError id="category-name-error" message={fieldErrors.name} />
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
          <div className="grid gap-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position" name="position" min="0" step="1"
              type="number"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="category-active">Active</Label>
            <Switch id="category-active"
              checked={form.is_active}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
          </div>
          {category && (
            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-md border bg-muted">
                  {category.category_image?.[0]?.image ? (
                    <img src={category.category_image[0].image} alt={category.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
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
                  {uploadMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          )}
        </div>
        <FormError error={mutation.error} />
        <DialogFooter>
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => { mutation.reset(); onOpenChange(false); }}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending || !form.name.trim()}>
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
