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
import { updateRestaurant, uploadRestaurantImage } from "@/services/restaurantService";
import type { RestaurantPayload } from "@/types/restaurant";
import { Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getRestaurant } from "@/services/restaurantService";
import { Bell, UserRound } from "lucide-react";
import { getNotificationPreferences, getUserProfile, updateNotificationPreferences, updateUserProfile, type NotificationPreferences } from "@/services/authService";
import { useSearchParams } from "react-router-dom";

export default function Settings() {
  const qc = useQueryClient();
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const restaurantId = role === "admin"
    ? Number(searchParams.get("restaurant")) || 0
    : Number(user?.profile?.id ?? 0);
  const { data, isLoading } = useQuery({
    queryKey: ["restaurant", restaurantId],
    queryFn: () => getRestaurant(restaurantId),
    enabled: restaurantId > 0,
  });

  const restaurant = data;
  const [form, setForm] = useState<RestaurantPayload>({});
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const profileQ = useQuery({ queryKey: ["user-profile"], queryFn: getUserProfile });
  const preferencesQ = useQuery({ queryKey: ["notification-preferences"], queryFn: getNotificationPreferences });
  useEffect(() => { if (profileQ.data) { setPhone(profileQ.data.phone ?? ""); setFirstName(profileQ.data.first_name ?? ""); setLastName(profileQ.data.last_name ?? ""); } }, [profileQ.data]);

  useEffect(() => {
    if (restaurant) {
      setForm({
        restaurant_name: restaurant.restaurant_name,
        business_license: restaurant.business_license,
        address: restaurant.address,
        opening_hours: restaurant.opening_hours ?? { Opening: "", Closing: "" },
        is_active: restaurant.is_active,
      });
    }
  }, [restaurant]);

  const saveMutation = useMutation({
    mutationFn: () => updateRestaurant(restaurant!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant", restaurantId] });
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
      qc.invalidateQueries({ queryKey: ["restaurant", restaurantId] });
      qc.invalidateQueries({ queryKey: ["restaurants"] });
      toast({ title: "Image uploaded" });
    },
    onError: (err) =>
      toast({ title: "Upload failed", description: extractApiError(err), variant: "destructive" }),
  });

  const profileMutation = useMutation({
    mutationFn: () => updateUserProfile({ phone, first_name: firstName, last_name: lastName }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["user-profile"] }); toast({ title: "Contact details updated" }); },
    onError: (err) => toast({ title: "Couldn't update contact", description: extractApiError(err), variant: "destructive" }),
  });
  const preferencesMutation = useMutation({
    mutationFn: (payload: Partial<NotificationPreferences>) => updateNotificationPreferences(payload),
    onSuccess: (next) => qc.setQueryData(["notification-preferences"], next),
    onError: (err) => toast({ title: "Couldn't update preferences", description: extractApiError(err), variant: "destructive" }),
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

      <Card id="account">
        <CardHeader><div className="settings-section-title"><span className="metric-icon"><UserRound size={17}/></span><div><CardTitle>Account & contact</CardTitle><CardDescription>Manage the contact information tied to your sign-in.</CardDescription></div></div></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2"><Label htmlFor="account-first-name">First name</Label><Input id="account-first-name" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)}/></div>
          <div className="grid gap-2"><Label htmlFor="account-last-name">Last name</Label><Input id="account-last-name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)}/></div>
          <div className="grid gap-2"><Label htmlFor="account-email">Account email</Label><Input id="account-email" value={profileQ.data?.email ?? ""} readOnly/><p className="text-xs text-muted-foreground">Email is your verified sign-in identity and cannot be changed here.</p></div>
          <div className="grid gap-2"><Label htmlFor="account-phone">Phone</Label><Input id="account-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Add a phone number"/></div>
          <div className="md:col-span-2 flex justify-end"><Button variant="outline" onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending || profileQ.isLoading}>{profileMutation.isPending ? "Saving…" : "Save contact"}</Button></div>
        </CardContent>
      </Card>

      <Card id="notifications">
        <CardHeader><div className="settings-section-title"><span className="metric-icon metric-icon-warm"><Bell size={17}/></span><div><CardTitle>Notifications</CardTitle><CardDescription>Choose which updates you receive.</CardDescription></div></div></CardHeader>
        <CardContent>
          {([
            ["receive_email", "Email updates", "Operational and account updates sent to your inbox."],
            ["receive_push", "Push notifications", "Alerts for registered mobile devices and this browser. Inbox updates also appear in the dashboard."],
            ["promotions_and_offers", "Promotions and offers", "Product and campaign announcements."],
            ["new_restaurants", "New restaurants and menu items", "Updates about new places and menus."],
            ["review_reminders", "Review reminders", "Reminders related to customer feedback."],
          ] as const).map(([key, title, description]) => <div key={key} className="preference-row"><div><Label htmlFor={`pref-${key}`}>{title}</Label><p>{description}</p></div><Switch id={`pref-${key}`} checked={!!preferencesQ.data?.[key]} disabled={preferencesQ.isLoading || preferencesMutation.isPending} onCheckedChange={(checked) => preferencesMutation.mutate({ [key]: checked })}/></div>)}
          {preferencesQ.isError && <p className="py-3 text-sm text-destructive">{extractApiError(preferencesQ.error)}</p>}
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
