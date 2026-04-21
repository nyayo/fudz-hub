import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api";
import {
  listRestaurants,
  updateRestaurant,
  uploadRestaurantImage,
} from "@/services/restaurantService";
import type { RestaurantPayload } from "@/types/restaurant";
import { Upload } from "lucide-react";

export default function Settings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["restaurants"],
    queryFn: listRestaurants,
  });

  const restaurant = data?.results[0];
  const [form, setForm] = useState<RestaurantPayload>({});
  const imageInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (restaurant) {
      setForm({
        restaurant_name: restaurant.restaurant_name,
        business_license: restaurant.business_license,
        address: restaurant.address,
        phone: restaurant.phone ?? "",
        opening_hours: restaurant.opening_hours ?? { Opening: "", Closing: "" },
        is_active: restaurant.is_active,
      });
    }
  }, [restaurant]);

  const saveMutation = useMutation({
    mutationFn: () => updateRestaurant(restaurant!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurants"] });
      toast({ title: "Restaurant updated" });
    },
    onError: (err) =>
      toast({ title: "Error", description: extractApiError(err), variant: "destructive" }),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ field, file }: { field: "image" | "logo"; file: File }) =>
      uploadRestaurantImage(restaurant!.id, field, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurants"] });
      toast({ title: "Image uploaded" });
    },
    onError: (err) =>
      toast({ title: "Upload failed", description: extractApiError(err), variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!restaurant) {
    return <p className="text-muted-foreground">No restaurant found for this account.</p>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Restaurant Settings</h1>
        <p className="text-muted-foreground">Manage your restaurant profile and branding.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Cover image and logo shown to customers.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Cover image</Label>
            <div className="aspect-video w-full overflow-hidden rounded-md border bg-muted">
              {restaurant.image ? (
                <img src={restaurant.image} alt="Cover" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No cover image
                </div>
              )}
            </div>
            <input
              ref={imageInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadMutation.mutate({ field: "image", file: f });
              }}
            />
            <Button variant="outline" size="sm" onClick={() => imageInput.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Upload cover
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="aspect-square w-32 overflow-hidden rounded-md border bg-muted">
              {restaurant.logo ? (
                <img src={restaurant.logo} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No logo
                </div>
              )}
            </div>
            <input
              ref={logoInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadMutation.mutate({ field: "logo", file: f });
              }}
            />
            <Button variant="outline" size="sm" onClick={() => logoInput.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Upload logo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Basic restaurant information.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Restaurant name</Label>
            <Input
              id="name"
              value={form.restaurant_name ?? ""}
              onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="license">Business license</Label>
            <Input
              id="license"
              value={form.business_license ?? ""}
              onChange={(e) => setForm({ ...form, business_license: e.target.value })}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Accept new orders</p>
            </div>
            <Switch
              checked={!!form.is_active}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Opening hours</CardTitle>
          <CardDescription>When customers can place orders.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="opening">Opening</Label>
            <Input
              id="opening"
              type="time"
              value={form.opening_hours?.Opening ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  opening_hours: { ...form.opening_hours, Opening: e.target.value },
                })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="closing">Closing</Label>
            <Input
              id="closing"
              type="time"
              value={form.opening_hours?.Closing ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  opening_hours: { ...form.opening_hours, Closing: e.target.value },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
