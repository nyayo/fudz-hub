import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, ImageOff, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuItemDialog } from "@/components/menu/MenuItemDialog";
import { BulkImportDialog } from "@/components/menu/BulkImportDialog";
import {
  deleteMenuItem,
  listCategories,
  listMenuItems,
  updateMenuItem,
} from "@/services/menuService";
import type { MenuItem } from "@/types/menu";
import { toast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api";

export default function Menu() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => listCategories(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["menu-items", { page, search, category }],
    queryFn: () =>
      listMenuItems({
        page,
        search: search || undefined,
        category: category === "all" ? "all" : Number(category),
      }),
  });

  const toggleAvailability = useMutation({
    mutationFn: ({ id, is_available }: { id: number; is_available: boolean }) =>
      updateMenuItem(id, { is_available }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu-items"] }),
    onError: (err) =>
      toast({ title: "Error", description: extractApiError(err), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMenuItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      toast({ title: "Item deleted" });
      setDeleteTarget(null);
    },
    onError: (err) =>
      toast({ title: "Error", description: extractApiError(err), variant: "destructive" }),
  });

  const items = data?.results ?? [];
  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.count / Math.max(items.length || 1, 1))) : 1),
    [data, items.length],
  );

  const onAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const onEdit = (item: MenuItem) => {
    setEditing(item);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Menu</h1>
          <p className="text-sm text-muted-foreground">
            Manage menu items, prices and availability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Bulk import
          </Button>
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" /> New item
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <Select
            value={category}
            onValueChange={(v) => {
              setPage(1);
              setCategory(v);
            }}
          >
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories?.results.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16"></TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Available</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No items found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const img = item.images?.[0]?.image;
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      {img ? (
                        <img
                          src={img}
                          alt={item.title}
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.title}</div>
                      {item.is_featured && (
                        <Badge variant="secondary" className="mt-1">
                          Featured
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{item.category_name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(item.price).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.is_available}
                        onCheckedChange={(v) =>
                          toggleAvailability.mutate({ id: item.id, is_available: v })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {data && data.count > items.length && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} • {data.count} items
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.next}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <MenuItemDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editing} />

      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}