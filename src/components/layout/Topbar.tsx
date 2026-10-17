import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, ChevronRight, Loader2, LogOut, Menu, Search, UserRound, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile } from "@/services/authService";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/notificationsService";

const routeTitles: Array<[string, string]> = [
  ["/admin/restaurants", "Restaurant directory"],
  ["/admin/users", "User access"],
  ["/admin/wishlists", "Wishlists"],
  ["/admin", "Platform overview"],
  ["/dashboard", "Overview"],
  ["/orders", "Orders"],
  ["/deliveries", "Delivery board"],
  ["/reviews", "Guest feedback"],
  ["/analytics", "Analytics"],
  ["/menu", "Menu items"],
  ["/categories", "Categories"],
  ["/promotions", "Promotions"],
  ["/staff", "Team access"],
  ["/settings", "Restaurant settings"],
  ["/account", "Account"],
];

interface TopbarProps {
  mobileNavOpen: boolean;
  onMenuClick: () => void;
}

export function Topbar({ mobileNavOpen, onMenuClick }: TopbarProps) {
  const { user, role, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const wasMobileNavOpen = useRef(false);
  const profileMenuRef = useRef<HTMLDetailsElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const profileQ = useQuery({ queryKey: ["user-profile"], queryFn: getUserProfile, staleTime: 60_000 });
  const notificationsQ = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const pageTitle = useMemo(() => {
    const exact = routeTitles.find(([path]) => location.pathname === path);
    if (exact) return exact[1];
    if (location.pathname.startsWith("/orders/")) return "Order details";
    return "Operations";
  }, [location.pathname]);
  const displayName = profileQ.data?.full_name || user?.full_name || user?.email || "Workspace user";
  const initials = (profileQ.data?.first_name?.[0] ?? user?.first_name?.[0] ?? "") + (profileQ.data?.last_name?.[0] ?? user?.last_name?.[0] ?? "");

  useEffect(() => {
    if (wasMobileNavOpen.current && !mobileNavOpen) mobileMenuButtonRef.current?.focus();
    wasMobileNavOpen.current = mobileNavOpen;
  }, [mobileNavOpen]);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) profileMenuRef.current?.removeAttribute("open");
      if (!notificationMenuRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  const submitSearch = () => {
    const query = search.trim();
    if (!query) return;
    navigate(`/orders?search=${encodeURIComponent(query)}`);
    setSearch("");
  };

  return (
    <header className="workspace-topbar">
      <button ref={mobileMenuButtonRef} type="button" className="chrome-icon-button mobile-menu-button" onClick={onMenuClick} aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileNavOpen} aria-controls="primary-navigation">{mobileNavOpen ? <X size={19} /> : <Menu size={19} />}</button>
      <div className="topbar-heading">
        <span className="topbar-crumb">FoGo Merchant <ChevronRight size={13} /> <span>{role === "admin" ? "Platform" : "Workspace"}</span></span>
        <strong>{pageTitle}</strong>
      </div>
      <label className="command-search">
        <Search size={16} aria-hidden="true" />
        <input
          aria-label="Search orders"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); }}
          placeholder="Search orders or customers"
        />
        <kbd>↵</kbd>
      </label>
      <div className="topbar-actions">
        <div className="notification-menu" ref={notificationMenuRef}>
          <button type="button" className="chrome-icon-button notification-button" onClick={() => setNotificationsOpen((open) => !open)} aria-label={`Notifications${notificationsQ.data?.unread_count ? `, ${notificationsQ.data.unread_count} unread` : ""}`} aria-expanded={notificationsOpen} aria-haspopup="dialog" title="Notifications">
            <Bell size={17} />
            {!!notificationsQ.data?.unread_count && <span className="notification-count">{notificationsQ.data.unread_count > 9 ? "9+" : notificationsQ.data.unread_count}</span>}
          </button>
          {notificationsOpen && <div className="notification-popover" role="dialog" aria-label="Notifications">
            <div className="notification-popover-head">
              <div><strong>Notifications</strong><small>{notificationsQ.data?.unread_count ?? 0} unread</small></div>
              <button type="button" className="notification-mark-all" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending || !notificationsQ.data?.unread_count}>
                {markAllRead.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />} Mark all read
              </button>
            </div>
            <div className="notification-list">
              {notificationsQ.isLoading ? <div className="notification-empty"><Loader2 size={16} className="animate-spin" /> Loading notifications…</div>
                : notificationsQ.isError ? <div className="notification-empty notification-error">Couldn’t load notifications. Try again shortly.</div>
                  : notificationsQ.data?.results.length ? notificationsQ.data.results.map((notice) => (
                    <button key={notice.id} type="button" className={`notification-item${notice.is_read ? " is-read" : ""}`} onClick={() => {
                      if (!notice.is_read) markRead.mutate(notice.id);
                      setNotificationsOpen(false);
                      if (notice.order_id) navigate(`/orders/${notice.order_id}`);
                    }}>
                      <span className="notification-unread-dot" aria-hidden="true" />
                      <span className="notification-item-copy"><strong>{notice.restaurant_name || (notice.event_type === "new_order" ? "New order" : "Order update")}</strong><span>{notice.message}</span><small>{formatDistanceToNow(new Date(notice.created_at), { addSuffix: true })}{notice.order_id ? ` · Order #${notice.order_id}` : ""}</small></span>
                    </button>
                  )) : <div className="notification-empty">You’re all caught up.</div>}
            </div>
            <button type="button" className="notification-settings-link" onClick={() => { setNotificationsOpen(false); navigate("/account#notifications"); }}>Notification preferences <ChevronRight size={14} /></button>
          </div>}
        </div>
        <div className="topbar-divider" />
        <details className="profile-menu" ref={profileMenuRef}>
          <summary className="profile-trigger">
            <span className="profile-avatar">{(initials || displayName[0] || "F").slice(0, 2).toUpperCase()}</span>
            <span className="profile-trigger-copy"><strong>{displayName}</strong><small>{role === "admin" ? "Platform admin" : role}</small></span>
            <ChevronRight className="profile-chevron" size={15} />
          </summary>
          <div className="profile-menu-popover">
            <div className="profile-popover-name"><strong>{displayName}</strong><span>{user?.email}</span></div>
            <button type="button" onClick={() => { profileMenuRef.current?.removeAttribute("open"); navigate("/account#account"); }}><UserRound size={16} /> Account profile</button>
            <button type="button" onClick={() => { profileMenuRef.current?.removeAttribute("open"); queryClient.clear(); logout(); }} className="logout-action"><LogOut size={16} /> Sign out</button>
          </div>
        </details>
      </div>
    </header>
  );
}