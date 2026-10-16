import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Heart, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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
import { extractApiError } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import {
  listAdminWishlists,
  removeAdminWishlistItem,
  type AdminWishlistItem,
} from "@/services/adminService";

const PAGE_SIZE = 20;
export default function AdminWishlists() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<AdminWishlistItem | null>(null);
  const query = useQuery({
    queryKey: ["admin", "wishlists", { page, search }],
    queryFn: () => listAdminWishlists({ page, search: search || undefined }),
  });
  const remove = useMutation({
    mutationFn: removeAdminWishlistItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "wishlists"] });
      setTarget(null);
      toast({ title: "Wishlist item removed" });
    },
    onError: (e) =>
      toast({
        title: "Could not remove item",
        description: extractApiError(e),
        variant: "destructive",
      }),
  });
  const rows = query.data?.results ?? [];
  const pages = Math.max(1, Math.ceil((query.data?.count ?? 0) / PAGE_SIZE));
  return (
    <div className="page-stack max-w-7xl">
      <header className="page-heading">
        <div>
          <p className="eyebrow">PLATFORM MANAGEMENT</p>
          <h1>Wishlists</h1>
          <p>
            Search saved menu items across customers and restaurants. Customer
            wishlists remain private to the customer API.
          </p>
        </div>
        <Badge variant="secondary">
          {query.data?.count ?? "—"} saved items
        </Badge>
      </header>
      <Card className="filter-panel">
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search customer, menu item or restaurant…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </Card>
      <Card className="table-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Saved item</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : query.isError ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-destructive"
                  >
                    {extractApiError(query.error)}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Heart />
                      <strong>No wishlist items found</strong>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <strong>{item.customer_name}</strong>
                      <span className="table-subline">
                        {item.customer_email || "No email on file"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.menu_item.images?.[0]?.image ? (
                          <img
                            src={item.menu_item.images[0].image}
                            alt=""
                            className="menu-item-image h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="metric-icon">
                            <Heart size={15} />
                          </span>
                        )}
                        <div>
                          <strong>{item.menu_item.title}</strong>
                          <span className="table-subline">
                            {Number(item.menu_item.price).toLocaleString(
                              undefined,
                              { style: "currency", currency: "UGX" },
                            )}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.restaurant_name}</TableCell>
                    <TableCell>
                      {new Date(item.added_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-left">
                      <IconButton
                        label="Delete wishlist item"
                        onClick={() => setTarget(item)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      {query.data && query.data.count > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!query.data.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!query.data.next}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
      <AlertDialog open={!!target} onOpenChange={(v) => !v && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this wishlist item?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove “{target?.menu_item.title}” from {target?.customer_name}’s
              wishlist. This does not delete the menu item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => target && remove.mutate(target.id)}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Removing…" : "Remove item"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
