import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api";
import {
  deletePromotion,
  listPromotions,
  uploadPromotionBanner,
} from "@/services/restaurantService";
import type { Promotion } from "@/types/restaurant";
import { PromotionDialog } from "@/components/promotions/PromotionDialog";
import { Plus, Pencil, Trash2, Upload, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";

export default function Promotions() {
  const qc = useQueryClient();
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Promotion | null>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const [bannerTarget, setBannerTarget] = useState<number | null>(null);

  const restaurantId = role === "admin"
    ? Number(searchParams.get("restaurant")) || undefined
    : Number(user?.profile?.id ?? 0) || undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["promotions", restaurantId, search, page],
    queryFn: () => listPromotions({ search, page, restaurant_id: restaurantId }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePromotion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotions"] });
      toast({ title: "Promotion deleted" });
      setConfirmDelete(null);
    },
    onError: (err) =>
      toast({ title: "Error", description: extractApiError(err), variant: "destructive" }),
  });

  const bannerMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadPromotionBanner(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotions"] });
      toast({ title: "Banner updated" });
    },
    onError: (err) =>
      toast({ title: "Upload failed", description: extractApiError(err), variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Promotions</h1>
          <p className="text-muted-foreground">Discount campaigns across your menu.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          disabled={role === "admin" && !restaurantId}
        >
          <Plus className="mr-2 h-4 w-4" /> New promotion
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search promotions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
      </Card>

      <Card className="table-card">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.results.length ? (
          <div className="p-12 text-center text-muted-foreground">No promotions yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banner</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.results.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="promotion-table-banner">
                      {p.banner ? (
                        <img src={p.banner} alt={p.name} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.discount ?? 0}%</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.start_date).toLocaleDateString()} →{" "}
                    {new Date(p.end_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {p.is_currently_active ? (
                      <Badge>Live</Badge>
                    ) : p.is_active ? (
                      <Badge variant="secondary">Scheduled</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-left">
                    <IconButton
                      label="Upload banner"
                      onClick={() => { setBannerTarget(p.id); bannerInput.current?.click(); }}
                    >
                      <Upload className="h-4 w-4" />
                    </IconButton>
                    
                    <IconButton
                      label="Edit promotion"
                      onClick={() => { setEditing(p); setDialogOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    
                    <IconButton
                      label="Delete promotion"
                      onClick={() => setConfirmDelete(p)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>

                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {data && data.count > data.results.length && <div className="flex items-center justify-between text-sm text-muted-foreground"><span>{data.count} promotions · page {page}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!data.previous} onClick={() => setPage((n) => Math.max(1, n - 1))}><ChevronLeft className="h-4 w-4"/>Previous</Button><Button variant="outline" size="sm" disabled={!data.next} onClick={() => setPage((n) => n + 1)}>Next<ChevronRight className="h-4 w-4"/></Button></div></div>}

      <input
        ref={bannerInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && bannerTarget) {
            if (!f.type.startsWith("image/")) toast({ title: "Choose an image file", description: "Select a JPG, PNG, or WebP image.", variant: "destructive" });
            else if (f.size > 5_000 * 1024) toast({ title: "Image is too large", description: "Choose an image no larger than 5000 KB.", variant: "destructive" });
            else bannerMutation.mutate({ id: bannerTarget, file: f });
          }
          e.target.value = "";
        }}
      />

      <PromotionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        promotion={editing}
        restaurantId={restaurantId}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete promotion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{confirmDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
