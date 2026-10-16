import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  UserRoundX,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";
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
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteAdminUser,
  listAdminUsers,
  updateAdminUser,
  type AdminUser,
} from "@/services/adminService";

const PAGE_SIZE = 20;
const TYPE_LABEL: Record<string, string> = {
  customer: "Customer",
  courier: "Courier",
  restaurant: "Restaurant owner",
  restaurant_staff: "Restaurant staff",
};

export default function AdminUsers() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [userType, setUserType] = useState("all");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const query = useQuery({
    queryKey: ["admin", "users", { page, search, userType }],
    queryFn: () =>
      listAdminUsers({
        page,
        search: search || undefined,
        user_type: userType === "all" ? undefined : userType,
      }),
  });
  const mutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: number;
      patch: { is_active?: boolean; is_verified?: boolean };
    }) => updateAdminUser(id, patch),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({
        title:
          variables.patch.is_active !== undefined
            ? "Account access updated"
            : "Verification status updated",
      });
    },
    onError: (error) =>
      toast({
        title: "Could not update account",
        description: extractApiError(error),
        variant: "destructive",
      }),
  });
  const removeMutation = useMutation({
    mutationFn: (id: number) => deleteAdminUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      setDeleteTarget(null);
      toast({ title: "Account deleted" });
    },
    onError: (error) =>
      toast({
        title: "Could not delete account",
        description: extractApiError(error),
        variant: "destructive",
      }),
  });
  const rows = query.data?.results ?? [];
  const pages = Math.max(1, Math.ceil((query.data?.count ?? 0) / PAGE_SIZE));
  const activeCount = rows.filter((u) => u.is_active).length;
  const verifiedCount = rows.filter((u) => u.is_verified).length;

  return (
    <div className="page-stack max-w-7xl admin-users-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">PLATFORM MANAGEMENT</p>
          <h1>Users</h1>
          <p>
            Manage account access and verification. Platform-admin identities
            and privileges are protected.
          </p>
        </div>
        <Badge variant="secondary">{query.data?.count ?? "—"} accounts</Badge>
      </header>
      <section className="metric-strip">
        <div className="metric-tile">
          <span className="metric-icon">
            <UsersRound size={17} />
          </span>
          <div>
            <small>Accounts on this page</small>
            <strong>{rows.length}</strong>
          </div>
        </div>
        <div className="metric-tile">
          <span className="metric-icon">
            <UserRoundCheck size={17} />
          </span>
          <div>
            <small>Active on this page</small>
            <strong>{activeCount}</strong>
          </div>
        </div>
        <div className="metric-tile">
          <span className="metric-icon metric-icon-warm">
            <BadgeCheck size={17} />
          </span>
          <div>
            <small>Verified on this page</small>
            <strong>{verifiedCount}</strong>
          </div>
        </div>
      </section>
      <Card className="filter-panel">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={userType}
            onValueChange={(v) => {
              setUserType(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All account types</SelectItem>
              <SelectItem value="customer">Customers</SelectItem>
              <SelectItem value="courier">Couriers</SelectItem>
              <SelectItem value="restaurant">Restaurant owners</SelectItem>
              <SelectItem value="restaurant_staff">Restaurant staff</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>
      <Card className="table-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Account type</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : query.isError ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-destructive"
                  >
                    {extractApiError(query.error)}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((u) => {
                  const isSelf = String(u.id) === String(user?.id);
                  const protectedAccount =
                    u.is_superuser || u.is_staff || isSelf;
                  const displayName =
                    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
                    u.username;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="admin-user-identity">
                          <span className="admin-user-avatar">
                            {displayName.slice(0, 1).toUpperCase()}
                          </span>
                          <span>
                            <strong>{displayName}</strong>
                            <small>
                              {u.email || u.phone || "No contact information"}
                            </small>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {TYPE_LABEL[u.user_type] ?? u.user_type}
                        </Badge>
                        {u.is_staff && (
                          <span className="table-subline inline-flex items-center gap-1">
                            <ShieldCheck size={12} /> Platform admin
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_verified ? "default" : "outline"}>
                          {u.is_verified ? "Verified" : "Unverified"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={u.is_active ? "default" : "destructive"}
                        >
                          {u.is_active ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-start gap-1">
                          <IconButton
                            size="sm"
                            variant="outline"
                            label={u.is_verified ? "Mark as unverified" : "Verify account"}
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({ id: u.id, patch: { is_verified: !u.is_verified } })}
                            className="border-0"
                          >
                            <BadgeCheck size={14} />
                          </IconButton>
                        
                          <IconButton
                            size="sm"
                            variant={u.is_active ? "outline" : "secondary"}
                            label={u.is_active ? "Disable account" : "Restore account"}
                            tooltip={protectedAccount ? "Protected accounts can't be disabled" : undefined}
                            disabled={mutation.isPending || protectedAccount}
                            onClick={() => mutation.mutate({ id: u.id, patch: { is_active: !u.is_active } })}
                            className="border-0"
                          >
                            {u.is_active ? <UserRoundX size={14} /> : <UserRoundCheck size={14} />}
                          </IconButton>
                        
                          <IconButton
                            label={`Delete ${displayName}`}
                            tooltip={
                              protectedAccount
                                ? "Platform admin, superuser, or current account cannot be deleted"
                                : "Delete account"
                            }
                            disabled={protectedAccount || removeMutation.isPending}
                            onClick={() => setDeleteTarget(u)}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
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
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this account permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.first_name} {deleteTarget?.last_name} (
              {deleteTarget?.email || deleteTarget?.username}) will be deleted.
              Related profile data may also be removed. This cannot be undone.
              Platform admin accounts are protected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteTarget && removeMutation.mutate(deleteTarget.id)
              }
            >
              {removeMutation.isPending ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
