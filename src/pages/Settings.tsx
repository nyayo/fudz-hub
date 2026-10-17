import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bell,
  Building2,
  Check,
  Clock3,
  ImagePlus,
  Loader2,
  MapPin,
  Settings2,
  Store,
  Upload,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api";
import {
  getNotificationPreferences,
  getUserProfile,
  updateNotificationPreferences,
  updateUserProfile,
  type NotificationPreferences,
} from "@/services/authService";
import { getRestaurant, updateRestaurant, uploadRestaurantImage } from "@/services/restaurantService";
import type { RestaurantPayload } from "@/types/restaurant";

function SettingsPageHeader() {
  return (
    <header className="page-heading account-page-heading">
      <div>
        <p className="eyebrow">WORKSPACE CONFIGURATION</p>
        <h1>Restaurant settings</h1>
        <p>Keep your storefront, business details, and team preferences up to date.</p>
      </div>
      <span className="account-type-pill inline-flex items-center gap-1.5">
        <Settings2 size={14} aria-hidden="true" /> Workspace profile
      </span>
    </header>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  warm = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  warm?: boolean;
}) {
  return (
    <CardHeader className="account-panel-header">
      <div className="settings-section-title">
        <span className={`metric-icon${warm ? " metric-icon-warm" : ""}`}>
          <Icon size={17} aria-hidden="true" />
        </span>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
  );
}

function LoadingSettings() {
  return (
    <div className="page-stack account-page restaurant-settings-page">
      <SettingsPageHeader />
      <Card className="account-overview-card">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="grid min-w-0 flex-1 gap-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-5 w-56 max-w-full" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
      </Card>
      <div className="account-settings-grid">
        {[0, 1, 2, 3].map((item) => (
          <Card className="account-panel" key={item}>
            <CardContent className="account-panel-content grid gap-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EmptySettingsState({ title, description }: { title: string; description: string }) {
  return (
    <div className="page-stack account-page restaurant-settings-page">
      <SettingsPageHeader />
      <Card className="account-panel">
        <CardContent className="account-panel-content">
          <div className="empty-state">
            <Store size={24} aria-hidden="true" />
            <strong>{title}</strong>
            <span>{description}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const restaurantId = role === "admin"
    ? Number(searchParams.get("restaurant")) || 0
    : Number(user?.profile?.id ?? 0);
  const restaurantQ = useQuery({
    queryKey: ["restaurant", restaurantId],
    queryFn: () => getRestaurant(restaurantId),
    enabled: restaurantId > 0,
  });
  const restaurant = restaurantQ.data;
  const [form, setForm] = useState<RestaurantPayload>({});
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const profileQ = useQuery({ queryKey: ["user-profile"], queryFn: getUserProfile });
  const preferencesQ = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: getNotificationPreferences,
  });

  useEffect(() => {
    if (profileQ.data) {
      setPhone(profileQ.data.phone ?? "");
      setFirstName(profileQ.data.first_name ?? "");
      setLastName(profileQ.data.last_name ?? "");
    }
  }, [profileQ.data]);

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
      queryClient.invalidateQueries({ queryKey: ["restaurant", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      toast({ title: "Restaurant updated" });
    },
    onError: (error) =>
      toast({ title: "Error", description: extractApiError(error), variant: "destructive" }),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ field, file }: { field: "image" | "logo"; file: File }) =>
      uploadRestaurantImage(restaurant!.id, field, file),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["restaurant", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      toast({ title: variables.field === "logo" ? "Logo uploaded" : "Cover image uploaded" });
    },
    onError: (error) =>
      toast({ title: "Upload failed", description: extractApiError(error), variant: "destructive" }),
  });

  const profileMutation = useMutation({
    mutationFn: () => updateUserProfile({ phone, first_name: firstName, last_name: lastName }),
    onSuccess: (next) => {
      queryClient.setQueryData(["user-profile"], next);
      toast({ title: "Contact details updated" });
    },
    onError: (error) =>
      toast({
        title: "Couldn't update contact",
        description: extractApiError(error),
        variant: "destructive",
      }),
  });

  const preferencesMutation = useMutation({
    mutationFn: (payload: Partial<NotificationPreferences>) => updateNotificationPreferences(payload),
    onSuccess: (next) => queryClient.setQueryData(["notification-preferences"], next),
    onError: (error) =>
      toast({
        title: "Couldn't update preferences",
        description: extractApiError(error),
        variant: "destructive",
      }),
  });

  if (restaurantQ.isLoading) return <LoadingSettings />;

  if (!restaurantId) {
    return (
      <EmptySettingsState
        title={role === "admin" ? "No restaurant selected" : "Restaurant workspace unavailable"}
        description={role === "admin"
          ? "Select a restaurant from the platform directory to manage its settings."
          : "We couldn't find a restaurant workspace for this account. Contact your platform administrator for help."}
      />
    );
  }

  if (restaurantQ.isError && !restaurant) {
    return (
      <div className="page-stack account-page restaurant-settings-page">
        <SettingsPageHeader />
        <Card className="account-panel">
          <CardContent className="account-panel-content">
            <div className="empty-state" role="alert">
              <Store size={24} aria-hidden="true" />
              <strong>Restaurant settings couldn't load</strong>
              <span>{extractApiError(restaurantQ.error)}</span>
              <Button variant="outline" onClick={() => void restaurantQ.refetch()}>
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <EmptySettingsState
        title="No restaurant found"
        description="There isn't a restaurant profile linked to this workspace yet."
      />
    );
  }

  const restaurantInitial = restaurant.restaurant_name.trim().slice(0, 1).toUpperCase() || "R";
  const uploadingField = uploadMutation.variables?.field;
  const profileFieldsReady = !!profileQ.data && !profileQ.isLoading;

  const handleImageSelect = (field: "image" | "logo", input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = "";
    if (file) uploadMutation.mutate({ field, file });
  };

  return (
    <div className="page-stack account-page restaurant-settings-page">
      <SettingsPageHeader />

      {restaurantQ.isError && (
        <div className="analytics-data-notice rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive" role="alert">
          <span>Couldn't refresh restaurant data. Showing the last loaded profile: {extractApiError(restaurantQ.error)}</span>
          <Button variant="ghost" size="sm" onClick={() => void restaurantQ.refetch()}>Retry</Button>
        </div>
      )}

      <Card className="account-overview-card">
        <div className="account-overview-avatar overflow-hidden p-0" aria-hidden="true">
          {restaurant.logo ? (
            <img src={restaurant.logo} alt="" className="h-full w-full object-cover" />
          ) : (
            restaurantInitial
          )}
        </div>
        <div className="account-overview-copy">
          <span className="eyebrow">YOUR RESTAURANT WORKSPACE</span>
          <strong>{restaurant.restaurant_name}</strong>
          <span className="flex items-center gap-1.5" title={restaurant.address || "Restaurant address not set"}>
            <MapPin size={12} aria-hidden="true" />
            {restaurant.address || "Add a business address in the profile section."}
          </span>
        </div>
        <div className="account-overview-meta">
          <span className="account-type-pill">Restaurant profile</span>
          <span>
            <span className={`workspace-status-dot${restaurant.is_active ? "" : " opacity-40"}`} />
            {restaurant.is_active ? "Accepting orders" : "Orders paused"}
          </span>
          <span>
            <BadgeCheck size={13} aria-hidden="true" />
            {restaurant.is_approved ? "Verified profile" : "Verification pending"}
          </span>
        </div>
      </Card>

      <nav className="tabs-scroll" aria-label="Restaurant settings sections">
        <div className="inline-flex min-w-full flex-wrap gap-1 rounded-xl border bg-white p-1.5 md:min-w-0">
          {[
            ["restaurant-profile", "Profile"],
            ["restaurant-branding", "Branding"],
            ["restaurant-hours", "Opening hours"],
            ["account", "Contact"],
            ["notifications", "Notifications"],
          ].map(([id, title]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {title}
            </a>
          ))}
        </div>
      </nav>

      <div className="account-settings-grid">
        <Card id="restaurant-profile" className="account-panel scroll-mt-24">
          <SectionHeader
            icon={Building2}
            title="Business profile"
            description="The essential details customers see for your restaurant."
          />
          <CardContent className="account-panel-content">
            <div className="account-profile-fields">
              <div className="grid gap-2">
                <Label htmlFor="restaurant-name">Restaurant name</Label>
                <Input
                  id="restaurant-name"
                  autoComplete="organization"
                  value={form.restaurant_name ?? ""}
                  onChange={(event) => setForm({ ...form, restaurant_name: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="business-license">Business license</Label>
                <Input
                  id="business-license"
                  value={form.business_license ?? ""}
                  onChange={(event) => setForm({ ...form, business_license: event.target.value })}
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="restaurant-address">Business address</Label>
                <Input
                  id="restaurant-address"
                  autoComplete="street-address"
                  value={form.address ?? ""}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border p-4">
              <div className="min-w-0">
                <Label htmlFor="restaurant-active">Accept new orders</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pause your storefront without changing your restaurant details.
                </p>
              </div>
              <Switch
                id="restaurant-active"
                checked={!!form.is_active}
                onCheckedChange={(value) => setForm({ ...form, is_active: value })}
              />
            </div>

            <div className="account-panel-footer">
              <span>Save applies to these details, availability, and opening hours.</span>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? <><Loader2 size={15} className="mr-2 animate-spin" />Saving…</>
                  : <><Check size={15} className="mr-2" />Save restaurant</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card id="restaurant-branding" className="account-panel scroll-mt-24">
          <SectionHeader
            icon={ImagePlus}
            title="Branding"
            description="Keep your customer-facing images clear and recognizable."
            warm
          />
          <CardContent className="account-panel-content grid gap-5">
            <div className="grid gap-3">
              <Label htmlFor="restaurant-cover-upload">Cover image</Label>
              <div className="aspect-video w-full overflow-hidden rounded-xl border bg-muted">
                {restaurant.image ? (
                  <img
                    src={restaurant.image}
                    alt={`${restaurant.restaurant_name} cover`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center gap-2 p-4 text-center text-muted-foreground">
                    <ImagePlus size={22} aria-hidden="true" />
                    <span className="text-xs">No cover image uploaded</span>
                  </div>
                )}
              </div>
              <input
                ref={imageInput}
                id="restaurant-cover-upload"
                type="file"
                accept="image/*"
                hidden
                aria-label="Choose restaurant cover image"
                onChange={(event) => handleImageSelect("image", event.currentTarget)}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                disabled={uploadMutation.isPending}
                onClick={() => imageInput.current?.click()}
              >
                {uploadingField === "image"
                  ? <Loader2 size={15} className="mr-2 animate-spin" />
                  : <Upload size={15} className="mr-2" />}
                {uploadingField === "image" ? "Uploading cover…" : "Upload cover"}
              </Button>
            </div>

            <div className="flex items-center gap-4 border-t pt-5">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-muted">
                {restaurant.logo ? (
                  <img
                    src={restaurant.logo}
                    alt={`${restaurant.restaurant_name} logo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store size={23} className="text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              <div className="grid min-w-0 gap-2">
                <div>
                  <Label htmlFor="restaurant-logo-upload">Restaurant logo</Label>
                  <p className="mt-1 text-xs text-muted-foreground">A square image works best in menus and listings.</p>
                </div>
                <input
                  ref={logoInput}
                  id="restaurant-logo-upload"
                  type="file"
                  accept="image/*"
                  hidden
                  aria-label="Choose restaurant logo"
                  onChange={(event) => handleImageSelect("logo", event.currentTarget)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  disabled={uploadMutation.isPending}
                  onClick={() => logoInput.current?.click()}
                >
                  {uploadingField === "logo"
                    ? <Loader2 size={15} className="mr-2 animate-spin" />
                    : <Upload size={15} className="mr-2" />}
                  {uploadingField === "logo" ? "Uploading logo…" : "Upload logo"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="restaurant-hours" className="account-panel scroll-mt-24">
          <SectionHeader
            icon={Clock3}
            title="Opening hours"
            description="Customers see these hours when deciding when to order."
          />
          <CardContent className="account-panel-content">
            <div className="account-profile-fields">
              <div className="grid gap-2">
                <Label htmlFor="restaurant-opening">Opening time</Label>
                <Input
                  id="restaurant-opening"
                  type="time"
                  value={form.opening_hours?.Opening ?? ""}
                  onChange={(event) => setForm({
                    ...form,
                    opening_hours: { ...form.opening_hours, Opening: event.target.value },
                  })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="restaurant-closing">Closing time</Label>
                <Input
                  id="restaurant-closing"
                  type="time"
                  value={form.opening_hours?.Closing ?? ""}
                  onChange={(event) => setForm({
                    ...form,
                    opening_hours: { ...form.opening_hours, Closing: event.target.value },
                  })}
                />
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              Opening hours are saved with the restaurant profile above.
            </div>
          </CardContent>
        </Card>

        <Card id="account" className="account-panel scroll-mt-24">
          <SectionHeader
            icon={UserRound}
            title="Account & contact"
            description="Contact details associated with your sign-in."
          />
          <CardContent className="account-panel-content">
            {profileQ.isLoading && <p className="analytics-loading-notice">Loading contact details…</p>}
            {profileQ.isError && (
              <div className="analytics-data-notice rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive" role="alert">
                <span>{profileQ.data ? "Couldn't refresh contact details. Showing saved details:" : "Couldn't load contact details:"} {extractApiError(profileQ.error)}</span>
                <Button variant="ghost" size="sm" onClick={() => void profileQ.refetch()}>Retry</Button>
              </div>
            )}
            {profileFieldsReady && (
              <>
                <div className="account-profile-fields">
                  <div className="grid gap-2">
                    <Label htmlFor="account-first-name">First name</Label>
                    <Input
                      id="account-first-name"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="account-last-name">Last name</Label>
                    <Input
                      id="account-last-name"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="account-email">Account email</Label>
                    <Input id="account-email" value={profileQ.data?.email ?? ""} readOnly />
                    <p className="text-xs text-muted-foreground">Your verified sign-in identity can't be changed here.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="account-phone">Phone</Label>
                    <Input
                      id="account-phone"
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Add a phone number"
                    />
                  </div>
                </div>
                <div className="account-panel-footer">
                  <span>Updates your personal account, not the restaurant contact listing.</span>
                  <Button
                    variant="outline"
                    onClick={() => profileMutation.mutate()}
                    disabled={profileMutation.isPending || profileQ.isLoading || !profileQ.data}
                  >
                    {profileMutation.isPending
                      ? <><Loader2 size={15} className="mr-2 animate-spin" />Saving…</>
                      : <><Check size={15} className="mr-2" />Save contact</>}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card id="notifications" className="account-panel scroll-mt-24 md:col-span-2">
          <SectionHeader
            icon={Bell}
            title="Notifications"
            description="Choose which updates you receive. Changes are saved as you make them."
            warm
          />
          <CardContent className="account-panel-content account-notification-content">
            {preferencesQ.isLoading && <p className="analytics-loading-notice">Loading notification preferences…</p>}
            {preferencesQ.isError && (
              <div className="analytics-data-notice rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive" role="alert">
                <span>Couldn't load notification preferences: {extractApiError(preferencesQ.error)}</span>
                <Button variant="ghost" size="sm" onClick={() => void preferencesQ.refetch()}>Retry</Button>
              </div>
            )}
            {preferencesQ.data && ([
              ["receive_email", "Email updates", "Operational and account updates sent to your inbox."],
              ["receive_push", "Push notifications", "Alerts for registered mobile devices and this browser. Inbox updates also appear in the dashboard."],
              ["promotions_and_offers", "Promotions and offers", "Product and campaign announcements."],
              ["new_restaurants", "New restaurants and menu items", "Updates about new places and menus."],
              ["review_reminders", "Review reminders", "Reminders related to customer feedback."],
            ] as const).map(([key, title, description]) => (
              <div key={key} className="preference-row">
                <div>
                  <Label htmlFor={`pref-${key}`}>{title}</Label>
                  <p>{description}</p>
                </div>
                <Switch
                  id={`pref-${key}`}
                  checked={!!preferencesQ.data[key]}
                  disabled={preferencesMutation.isPending}
                  onCheckedChange={(checked) => preferencesMutation.mutate({ [key]: checked })}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
