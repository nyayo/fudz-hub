import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Plus,
  ChevronLeft,
  ChevronRight,
  Copy,
  MapPin,
  MoreHorizontal,
  Pause,
  Play,
  Search,
  Settings2,
  Store,
  Tag,
  Users,
  Utensils,
  X,
} from "lucide-react";
import type { LatLngTuple } from "leaflet";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RestaurantLocationPicker } from "@/components/RestaurantLocationPicker";
import { extractApiError } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import {
  listAdminRestaurants,
  createAdminRestaurant,
  updateAdminRestaurant,
  type AdminRestaurant,
} from "@/services/adminService";

const PAGE_SIZE = 20;

export default function AdminRestaurants() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [approval, setApproval] = useState("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ restaurant_name: "", business_license: "", address: "", owner_email: "", owner_first_name: "", owner_last_name: "" });
  const createMutation = useMutation({
    mutationFn: () => createAdminRestaurant(createForm),
    onSuccess: () => { setCreateOpen(false); setCreateForm({ restaurant_name: "", business_license: "", address: "", owner_email: "", owner_first_name: "", owner_last_name: "" }); qc.invalidateQueries({ queryKey: ["admin", "restaurants"] }); toast({ title: "Restaurant created", description: "An activation invitation was sent to the owner email." }); },
    onError: (error) => toast({ title: "Creation failed", description: extractApiError(error), variant: "destructive" }),
  });
  const [locationTarget, setLocationTarget] = useState<AdminRestaurant | null>(null);
  const [locationCoordinates, setLocationCoordinates] =
    useState<LatLngTuple | null>(null);
  const [locationCleared, setLocationCleared] = useState(false);
  const approved = approval === "all" ? undefined : approval === "approved";
  const query = useQuery({
    queryKey: ["admin", "restaurants", { page, search, approval }],
    queryFn: () =>
      listAdminRestaurants({
        page,
        search: search || undefined,
        is_approved: approved,
      }),
  });
  const mutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: number;
      patch: {
        is_approved?: boolean;
        is_active?: boolean;
        latitude?: number | null;
        longitude?: number | null;
      };
    }) => updateAdminRestaurant(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "restaurants"] });
      qc.invalidateQueries({ queryKey: ["restaurants"] });
      toast({ title: "Restaurant updated" });
    },
    onError: (error) =>
      toast({
        title: "Update failed",
        description: extractApiError(error),
        variant: "destructive",
      }),
  });
  const rows = query.data?.results ?? [];
  const pages = Math.max(1, Math.ceil((query.data?.count ?? 0) / PAGE_SIZE));

  const openLocation = (restaurant: AdminRestaurant) => {
    setLocationTarget(restaurant);
    setLocationCleared(false);
    setLocationCoordinates(
      restaurant.location_latitude != null &&
        restaurant.location_longitude != null
        ? [
            Number(restaurant.location_latitude),
            Number(restaurant.location_longitude),
          ]
        : null,
    );
  };

  const copySignupLink = async () => {
    const signupUrl = `${window.location.origin}/login`;
    try {
      await navigator.clipboard.writeText(signupUrl);
      toast({
        title: "Public restaurant sign-up link copied",
        description: signupUrl,
      });
    } catch {
      toast({
        title: "Public restaurant sign-up link",
        description: signupUrl,
      });
    }
  };

  const saveLocation = () => {
    if (!locationTarget || (locationCoordinates == null && !locationCleared))
      return;
    const latitude = locationCoordinates?.[0] ?? null;
    const longitude = locationCoordinates?.[1] ?? null;
    mutation.mutate(
      { id: locationTarget.id, patch: { latitude, longitude } },
      { onSuccess: () => setLocationTarget(null) },
    );
  };

  return (
    <div className="page-stack max-w-7xl">
      <header className="page-heading">
        <div>
          <p className="eyebrow">PLATFORM MANAGEMENT</p>
          <h1>Restaurants</h1>
          <p>
            Review profiles, approve onboarding, and manage each restaurant from
            one menu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{query.data?.count ?? "—"} total</Badge>
          <Button variant="outline" onClick={() => void copySignupLink()}><Copy size={15} /> Copy public sign-up link</Button>
          <Button onClick={() => setCreateOpen(true)}><Plus size={15} /> Add restaurant</Button>
        </div>
      </header>

      <Card className="filter-panel">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search restaurant, address or owner…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={approval}
            onValueChange={(value) => {
              setApproval(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All approval states</SelectItem>
              <SelectItem value="pending">Pending review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="table-card admin-restaurant-card">
        <div className="overflow-x-auto">
          <Table className="admin-restaurant-table">
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Portfolio</TableHead>
                <TableHead>Map location</TableHead>
                <TableHead>Access & status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <TableRow key={index}>
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
                    No restaurants match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((restaurant) => (
                  <TableRow key={restaurant.id}>
                    <TableCell>
                      <div className="flex min-w-48 items-center gap-3">
                        {restaurant.logo ? (
                          <img
                            src={restaurant.logo}
                            alt=""
                            className="table-image-square h-10 w-10 rounded-xl object-cover"
                          />
                        ) : (
                          <span className="metric-icon">
                            <Store size={16} />
                          </span>
                        )}
                        <div className="min-w-0">
                          <strong>{restaurant.restaurant_name}</strong>
                          <span className="table-subline line-clamp-2">
                            {restaurant.address}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <strong>{restaurant.owner_name || "—"}</strong>
                      <span className="table-subline">
                        {restaurant.owner_email ||
                          restaurant.phone ||
                          "No owner contact"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <strong>{restaurant.menu_items_count} items</strong>
                      <span className="table-subline">
                        {restaurant.categories_count} categories · ★{" "}
                        {Number(restaurant.avg_rating || 0).toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {restaurant.location_latitude != null &&
                      restaurant.location_longitude != null ? (
                        <span className="restaurant-map-cell">
                          <MapPin size={13} /> Pin set
                          <span className="table-subline">
                            {Number(restaurant.location_latitude).toFixed(4)},{" "}
                            {Number(restaurant.location_longitude).toFixed(4)}
                          </span>
                        </span>
                      ) : (
                        <Badge variant="outline">Pin needed</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="restaurant-status-stack">
                        <Badge
                          variant={
                            restaurant.is_approved ? "default" : "outline"
                          }
                        >
                          {restaurant.is_approved
                            ? "Approved"
                            : "Pending review"}
                        </Badge>
                        <Badge
                          variant={
                            restaurant.is_active ? "secondary" : "destructive"
                          }
                        >
                          {restaurant.is_active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="restaurant-actions-trigger border-0"
                          >
                            <Settings2 size={14} /> Manage{" "}
                            <MoreHorizontal size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-52">
                          <DropdownMenuLabel>
                            Restaurant workspace
                          </DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link to={`/menu?restaurant=${restaurant.id}`}>
                              <Utensils size={14} className="mr-2" />
                              Menu items
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              to={`/categories?restaurant=${restaurant.id}`}
                            >
                              <Store size={14} className="mr-2" />
                              Categories
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              to={`/promotions?restaurant=${restaurant.id}`}
                            >
                              <Tag size={14} className="mr-2" />
                              Campaigns
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/staff?restaurant=${restaurant.id}`}>
                              <Users size={14} className="mr-2" />
                              Team access
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/settings?restaurant=${restaurant.id}`}>
                              <Settings2 size={14} className="mr-2" />
                              Restaurant profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => openLocation(restaurant)}
                          >
                            <MapPin size={14} className="mr-2" />
                            Set map location
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={mutation.isPending}
                            onSelect={() =>
                              mutation.mutate({
                                id: restaurant.id,
                                patch: { is_approved: !restaurant.is_approved },
                              })
                            }
                          >
                            {restaurant.is_approved ? (
                              <>
                                <X size={14} className="mr-2" />
                                Revoke approval
                              </>
                            ) : (
                              <>
                                <Check size={14} className="mr-2" />
                                Approve restaurant
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={mutation.isPending}
                            onSelect={() =>
                              mutation.mutate({
                                id: restaurant.id,
                                patch: { is_active: !restaurant.is_active },
                              })
                            }
                          >
                            {restaurant.is_active ? (
                              <>
                                <Pause size={14} className="mr-2" />
                                Pause operations
                              </>
                            ) : (
                              <>
                                <Play size={14} className="mr-2" />
                                Resume operations
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!query.data.next}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Add restaurant</DialogTitle><DialogDescription>Create the workspace and send the owner a secure activation invitation.</DialogDescription></DialogHeader>
          <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }}>
            <div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Restaurant name" value={createForm.restaurant_name} onChange={(event) => setCreateForm({ ...createForm, restaurant_name: event.target.value })} required /><Input placeholder="Business licence" value={createForm.business_license} onChange={(event) => setCreateForm({ ...createForm, business_license: event.target.value })} required /></div>
            <Input placeholder="Restaurant address" value={createForm.address} onChange={(event) => setCreateForm({ ...createForm, address: event.target.value })} required />
            <div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Owner first name" value={createForm.owner_first_name} onChange={(event) => setCreateForm({ ...createForm, owner_first_name: event.target.value })} required /><Input placeholder="Owner last name" value={createForm.owner_last_name} onChange={(event) => setCreateForm({ ...createForm, owner_last_name: event.target.value })} required /></div>
            <Input type="email" placeholder="Owner email" value={createForm.owner_email} onChange={(event) => setCreateForm({ ...createForm, owner_email: event.target.value })} required />
            <DialogFooter><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating…" : "Create and send invite"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!locationTarget}
        onOpenChange={(open) => {
          if (!open) setLocationTarget(null);
        }}
      >
        <DialogContent className="max-w-2xl restaurant-location-dialog">
          <DialogHeader>
            <DialogTitle>Restaurant pickup location</DialogTitle>
            <DialogDescription>
              {locationTarget?.restaurant_name}
              {locationTarget?.address ? ` · ${locationTarget.address}` : ""}.
              Search the address or place a pin directly on the map.
            </DialogDescription>
          </DialogHeader>
          <RestaurantLocationPicker
            value={locationCoordinates}
            onChange={(value) => {
              setLocationCoordinates(value);
              setLocationCleared(false);
            }}
            initialSearch={locationTarget?.address ?? ""}
            label="Adjust restaurant pin"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setLocationCoordinates(null);
                setLocationCleared(true);
              }}
            >
              Clear location
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocationTarget(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                !locationTarget ||
                mutation.isPending ||
                (locationCoordinates == null && !locationCleared) ||
                (locationCoordinates != null &&
                  locationCoordinates[0] === 0 &&
                  locationCoordinates[1] === 0)
              }
              onClick={saveLocation}
            >
              {mutation.isPending ? "Saving…" : "Save location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
