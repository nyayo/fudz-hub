import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, LockKeyhole, Loader2, Monitor, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getNotificationPreferences, getUserProfile, updateNotificationPreferences, updateUserProfile, type NotificationPreferences } from "@/services/authService";
import { sendTestNotification } from "@/services/notificationsService";
import { disableBrowserPush, enableBrowserPush, getBrowserPushStatus } from "@/services/webPushService";
import { extractApiError } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function Account() {
  const queryClient = useQueryClient();
  const profileQ = useQuery({ queryKey: ["user-profile"], queryFn: getUserProfile });
  const preferencesQ = useQuery({ queryKey: ["notification-preferences"], queryFn: getNotificationPreferences });
  const browserPushQ = useQuery({ queryKey: ["browser-push-status"], queryFn: getBrowserPushStatus, refetchOnWindowFocus: true });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profileQ.data) {
      setFirstName(profileQ.data.first_name ?? "");
      setLastName(profileQ.data.last_name ?? "");
      setPhone(profileQ.data.phone ?? "");
    }
  }, [profileQ.data]);

  const saveProfile = useMutation({
    mutationFn: () => updateUserProfile({ first_name: firstName, last_name: lastName, phone }),
    onSuccess: (next) => { queryClient.setQueryData(["user-profile"], next); toast({ title: "Profile updated" }); },
    onError: (error) => toast({ title: "Couldn't update profile", description: extractApiError(error), variant: "destructive" }),
  });
  const savePreference = useMutation({
    mutationFn: (payload: Partial<NotificationPreferences>) => updateNotificationPreferences(payload),
    onSuccess: (next) => queryClient.setQueryData(["notification-preferences"], next),
    onError: (error) => toast({ title: "Couldn't update preference", description: extractApiError(error), variant: "destructive" }),
  });
  const testNotification = useMutation({
    mutationFn: sendTestNotification,
    onSuccess: (response) => toast({ title: "Test notification queued", description: response.message || "Check your registered device." }),
    onError: (error) => toast({ title: "Test notification failed", description: extractApiError(error), variant: "destructive" }),
  });
  const enableBrowserNotifications = useMutation({
    mutationFn: (permissionRequest: Promise<NotificationPermission>) => enableBrowserPush(permissionRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["browser-push-status"] });
      toast({ title: "Browser notifications enabled", description: "This browser is now registered for Fudz Hub push alerts." });
    },
    onError: (error) => toast({ title: "Couldn't enable browser notifications", description: error instanceof Error ? error.message : extractApiError(error), variant: "destructive" }),
  });
  const disableBrowserNotifications = useMutation({
    mutationFn: disableBrowserPush,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["browser-push-status"] });
      toast({ title: "Browser notifications disabled" });
    },
    onError: (error) => toast({ title: "Couldn't disable browser notifications", description: extractApiError(error), variant: "destructive" }),
  });

  const preferences = [
    ["receive_email", "Email updates", "Operational and account updates sent to your inbox."],
    ["receive_push", "Push notifications", "Mobile and browser alerts; inbox updates stay in the dashboard."],
    ["promotions_and_offers", "Promotions and offers", "Product and campaign announcements."],
    ["new_restaurants", "New restaurants and menu items", "Updates about new places and menus."],
    ["review_reminders", "Review reminders", "Reminders related to customer feedback."],
  ] as const;
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || profileQ.data?.email || "Your account";
  const initials = displayName.trim().slice(0, 1).toUpperCase();
  const accountType = profileQ.data?.user_type?.replace(/_/g, " ") || "workspace member";

  return <div className="page-stack account-page">
    <header className="page-heading account-page-heading"><div><p className="eyebrow">PROFILE & PREFERENCES</p><h1>Account</h1><p>Keep your personal details current and choose how Fudz Hub reaches you.</p></div><span className="account-secure-chip"><ShieldCheck size={14}/> Secure sign-in</span></header>

    <Card className="account-overview-card">
      <div className="account-overview-avatar" aria-hidden="true">{initials}</div>
      <div className="account-overview-copy"><span className="eyebrow">YOUR FUDZ HUB PROFILE</span><strong>{profileQ.isLoading ? "Loading profile…" : displayName}</strong><span>{profileQ.data?.email || "Email not available"}</span></div>
      <div className="account-overview-meta"><span className="account-type-pill">{accountType}</span><span><LockKeyhole size={13}/> OTP-protected account</span></div>
    </Card>
    {profileQ.isError && <div className="analytics-data-notice" role="alert">Couldn't load account profile: {extractApiError(profileQ.error)}</div>}

    <div className="account-settings-grid">
      <Card id="account" className="account-panel">
        <CardHeader className="account-panel-header"><div className="settings-section-title"><span className="metric-icon"><UserRound size={17}/></span><div><CardTitle>Personal details</CardTitle><CardDescription>Used for your profile and team communication.</CardDescription></div></div></CardHeader>
        <CardContent className="account-panel-content">
          <div className="account-profile-fields">
            <div className="grid gap-2"><Label htmlFor="account-first-name">First name</Label><Input id="account-first-name" autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)}/></div>
            <div className="grid gap-2"><Label htmlFor="account-last-name">Last name</Label><Input id="account-last-name" autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)}/></div>
            <div className="grid gap-2"><Label htmlFor="account-email">Account email</Label><Input id="account-email" value={profileQ.data?.email ?? ""} readOnly/><p className="text-xs text-muted-foreground">This verified sign-in identity can't be changed here.</p></div>
            <div className="grid gap-2"><Label htmlFor="account-phone">Phone</Label><Input id="account-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Add a phone number"/></div>
          </div>
          <div className="account-panel-footer"><span>Changes apply to your personal account.</span><Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending || profileQ.isLoading}>{saveProfile.isPending ? <><Loader2 size={15} className="mr-2 animate-spin"/>Saving…</> : <><Check size={15} className="mr-2"/>Save profile</>}</Button></div>
        </CardContent>
      </Card>

      <Card id="notifications" className="account-panel">
        <CardHeader className="account-panel-header"><div className="settings-section-title"><span className="metric-icon metric-icon-warm"><Bell size={17}/></span><div><CardTitle>Notifications</CardTitle><CardDescription>Choose the updates that matter to your work.</CardDescription></div></div></CardHeader>
        <CardContent className="account-panel-content account-notification-content">
          {preferences.map(([key, title, description]) => <div key={key} className="preference-row"><div><Label htmlFor={`pref-${key}`}>{title}</Label><p>{description}</p></div><Switch id={`pref-${key}`} checked={!!preferencesQ.data?.[key]} disabled={preferencesQ.isLoading || savePreference.isPending} onCheckedChange={(checked) => savePreference.mutate({ [key]: checked })}/></div>)}
          {preferencesQ.isError && <p className="py-3 text-sm text-destructive">{extractApiError(preferencesQ.error)}</p>}
        </CardContent>
      </Card>
    </div>

    <Card className="account-panel account-browser-card">
      <CardHeader className="account-panel-header"><div className="settings-section-title"><span className="metric-icon"><Monitor size={17}/></span><div><CardTitle>Browser notifications</CardTitle><CardDescription>Send alerts to this browser even when Fudz Hub isn't open.</CardDescription></div></div></CardHeader>
      <CardContent className="account-browser-content">
        <div className="account-browser-status"><span className={`account-browser-indicator${browserPushQ.data?.subscribed ? " is-on" : ""}`}/><div><strong>{browserPushQ.data?.subscribed ? "This browser is subscribed" : "This browser isn't subscribed yet"}</strong><p>{browserPushQ.data?.subscribed ? "Push alerts are registered on this device." : "Permission is requested only when you enable browser alerts."}</p></div></div>
        <div className="account-browser-actions">
          {browserPushQ.data && !browserPushQ.data.supported && <p className="account-browser-warning">This browser or connection doesn't support Web Push. Use a supported browser on HTTPS.</p>}
          {browserPushQ.data?.permission === "denied" && <p className="account-browser-warning">Notifications are blocked for this site. Change the browser’s site permission, then retry.</p>}
          {browserPushQ.data?.supported && !browserPushQ.data.configured && <p className="account-browser-warning">Web Push isn't configured yet. Set the public VAPID key as documented in the setup guide and rebuild the web app.</p>}
          <Button variant={browserPushQ.data?.subscribed ? "outline" : "default"} disabled={browserPushQ.isLoading || !browserPushQ.data?.supported || !browserPushQ.data.configured || enableBrowserNotifications.isPending || disableBrowserNotifications.isPending} onClick={() => {
            if (browserPushQ.data?.subscribed) {
              disableBrowserNotifications.mutate();
              return;
            }
            const permissionRequest = typeof Notification !== "undefined" && Notification.permission === "default"
              ? Notification.requestPermission()
              : Promise.resolve(typeof Notification !== "undefined" ? Notification.permission : "denied");
            enableBrowserNotifications.mutate(permissionRequest);
          }}>
            {enableBrowserNotifications.isPending || disableBrowserNotifications.isPending ? <Loader2 size={15} className="mr-2 animate-spin"/> : null}
            {browserPushQ.data?.subscribed ? "Disable browser alerts" : "Enable browser alerts"}
          </Button>
        </div>
      </CardContent>
      <div className="account-browser-footer"><a href="/notification-setup.md" target="_blank" rel="noreferrer" className="text-sm font-medium text-primary-foreground hover:underline">Open notification setup guide</a><Button variant="outline" onClick={() => testNotification.mutate()} disabled={testNotification.isPending}>{testNotification.isPending ? "Queuing test…" : "Send test push"}</Button></div>
    </Card>
  </div>;
}
