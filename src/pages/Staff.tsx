import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IconButton } from "@/components/ui/icon-button";

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
import {
  Search,
  UserPlus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api";
import { listStaff, deleteStaff } from "@/services/staffService";
import { STAFF_ROLE_LABEL, type StaffMember } from "@/types/staff";
import { StaffDialog } from "@/components/staff/StaffDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";

function staffName(s: StaffMember) {
  const first =
    s.first_name ?? s.first_name_display ?? s.user?.first_name ?? "";
  const last = s.last_name ?? s.last_name_display ?? s.user?.last_name ?? "";
  const full = `${first} ${last}`.trim();
  return (
    full ||
    s.full_name ||
    s.email_display ||
    s.email ||
    s.user?.email ||
    `Staff #${s.id}`
  );
}

export default function Staff() {
  const qc = useQueryClient();
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StaffMember | null>(null);
  const [page, setPage] = useState(1);

  const restaurantId =
    role === "admin"
      ? Number(searchParams.get("restaurant")) || null
      : Number(user?.profile?.id ?? 0) || null;

  const { data, isLoading } = useQuery({
    queryKey: ["staff", restaurantId, page],
    queryFn: () =>
      listStaff({ page, restaurant_id: restaurantId ?? undefined }),
  });

  const filtered = useMemo(() => {
    const list = data?.results ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => {
      const name = staffName(s).toLowerCase();
      const email = (
        s.email_display ??
        s.email ??
        s.user?.email ??
        ""
      ).toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        s.role.toLowerCase().includes(q)
      );
    });
  }, [data, search]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStaff(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff removed" });
      setConfirmDelete(null);
    },
    onError: (err) =>
      toast({
        title: "Error",
        description: extractApiError(err),
        variant: "destructive",
      }),
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (s: StaffMember) => {
    setEditing(s);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground">
            Manage team members and their access.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!restaurantId}>
          <UserPlus className="h-4 w-4" />
          Invite staff
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      <Card className="table-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-sm text-muted-foreground py-10"
                >
                  {search
                    ? "No staff match your search."
                    : "No staff yet. Invite your first team member."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{staffName(s)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.email_display ?? s.email ?? s.user?.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {STAFF_ROLE_LABEL[s.role] ?? s.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.is_active ? "default" : "outline"}>
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-left">
                    <IconButton
                      label="Edit staff member"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label="Remove staff member"
                      onClick={() => setConfirmDelete(s)}
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
      </Card>

      {data && data.count > data.results.length && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data.count} team members · page {page}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data.previous}
              onClick={() => setPage((n) => Math.max(1, n - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.next}
              onClick={() => setPage((n) => n + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <StaffDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        restaurantId={restaurantId}
        staff={editing}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete && staffName(confirmDelete)} will lose access
              immediately. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDelete && deleteMutation.mutate(confirmDelete.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
