import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  ChevronRight,
  Heart,
  LayoutDashboard,
  MessageSquareText,
  Percent,
  Settings2,
  ShoppingBag,
  Store,
  Tags,
  Truck,
  UserRound,
  UsersRound,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { NavLink, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminRestaurant } from "@/services/adminService";

interface AppSidebarProps {
  mobileOpen: boolean;
  onNavigate: () => void;
}

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  end?: boolean;
}

const platformItems: NavItem[] = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Restaurants", url: "/admin/restaurants", icon: Store },
  { title: "Orders", url: "/orders", icon: ShoppingBag },
  { title: "Delivery", url: "/deliveries", icon: Truck },
  { title: "Reviews", url: "/reviews", icon: MessageSquareText },
  { title: "Users", url: "/admin/users", icon: UsersRound },
  { title: "Wishlists", url: "/admin/wishlists", icon: Heart },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Account", url: "/account", icon: UserRound },
];

const operationsItems: NavItem[] = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard, end: true },
  { title: "Orders", url: "/orders", icon: ShoppingBag },
  { title: "Delivery board", url: "/deliveries", icon: Truck },
  { title: "Guest feedback", url: "/reviews", icon: MessageSquareText },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const catalogItems: NavItem[] = [
  { title: "Menu items", url: "/menu", icon: UtensilsCrossed },
  { title: "Categories", url: "/categories", icon: Tags },
  { title: "Promotions", url: "/promotions", icon: Percent },
];

const teamItems: NavItem[] = [
  { title: "Team access", url: "/staff", icon: UsersRound },
  { title: "Account", url: "/account", icon: UserRound },
  { title: "Restaurant settings", url: "/settings", icon: Settings2 },
];

function initials(name: string) {
  return name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "F";
}

export function AppSidebar({ mobileOpen, onNavigate }: AppSidebarProps) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches);
  const sidebarRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedRestaurant = searchParams.get("restaurant");
  const isAdmin = role === "admin";
  const selectedRestaurantId = Number(selectedRestaurant) || 0;
  const selectedRestaurantQ = useQuery({
    queryKey: ["admin-restaurant", selectedRestaurantId],
    queryFn: () => getAdminRestaurant(selectedRestaurantId),
    enabled: isAdmin && selectedRestaurantId > 0,
    staleTime: 5 * 60_000,
  });
  const selectedRestaurantName = selectedRestaurantQ.data?.restaurant_name || "Selected restaurant";
  const restaurantName = typeof user?.profile?.restaurant_name === "string"
    ? user.profile.restaurant_name
    : typeof user?.profile?.restaurant === "string"
      ? user.profile.restaurant
      : "Restaurant workspace";
  const displayName = user?.full_name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Workspace user";
  const selectedCatalogItems = selectedRestaurant
    ? catalogItems.map((item) => ({ ...item, url: `${item.url}?restaurant=${selectedRestaurant}` }))
    : [];
  const selectedTeamItems = selectedRestaurant
    ? [
        { title: "Team access", url: `/staff?restaurant=${selectedRestaurant}`, icon: UsersRound },
        { title: "Restaurant settings", url: `/settings?restaurant=${selectedRestaurant}`, icon: Settings2 },
      ]
    : [];

  const renderItems = (items: NavItem[]) => (
    <ul className="workspace-nav-list">
      {items.map(({ title, url, icon: Icon, end }) => (
        <li key={title}>
          <NavLink
            to={url}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) => `workspace-nav-item${isActive ? " is-active" : ""}`}
          >
            <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
            <span>{title}</span>
            {title === "Orders" && <span className="nav-item-hint" aria-hidden="true"><ChevronRight size={13} /></span>}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  const renderGroup = (label: string, items: NavItem[], accessory?: ReactNode) => (
    <section className="workspace-nav-group" key={label}>
      <div className="workspace-nav-label"><span>{label}</span>{accessory}</div>
      {renderItems(items)}
    </section>
  );

  const restaurantRoles = ["owner", "manager", "waiter", "cashier", "staff"].includes(role);
  const operationalStaffItems = teamItems.filter((item) => item.title === "Account");

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const updateViewport = () => setIsMobile(media.matches);
    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    if (isMobile && !mobileOpen) sidebar.setAttribute("inert", "");
    else sidebar.removeAttribute("inert");
  }, [isMobile, mobileOpen]);

  useEffect(() => {
    if (isMobile && mobileOpen) closeButtonRef.current?.focus();
  }, [isMobile, mobileOpen]);

  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onNavigate();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])
        .filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isMobile, mobileOpen, onNavigate]);

  return (
    <aside id="primary-navigation" ref={sidebarRef} className={`app-sidebar${mobileOpen ? " is-mobile-open" : ""}`} aria-label="Primary navigation" aria-hidden={isMobile && !mobileOpen}>
      <div className="sidebar-brand-row">
        <div className="brand-full">
          <img className="brand-full-logo" src="/logo.png" alt="FoGo" width={84} height={41} />
          <small>MARCHANT · OPERATIONS</small>
        </div>
        <button ref={closeButtonRef} type="button" className="sidebar-mobile-close" onClick={onNavigate} aria-label="Close navigation"><X size={19} /></button>
      </div>

      <div className="workspace-switcher">
        <span className="workspace-avatar"><Store size={16} /></span>
        <span className="workspace-switcher-copy"><small>{isAdmin ? (selectedRestaurant ? "RESTAURANT" : "PLATFORM") : "WORKSPACE"}</small><strong>{isAdmin ? (selectedRestaurant ? selectedRestaurantName : "FoGo Platform") : restaurantName}</strong></span>
        <span className="workspace-status-dot" title="Signed in" />
      </div>

      <nav className="workspace-navigation">
        {isAdmin ? (
          <>
            {renderGroup("Platform", platformItems)}
            {selectedRestaurant && renderGroup("Restaurant tools", [...selectedCatalogItems, ...selectedTeamItems], <span className="nav-scope-tag">{selectedRestaurantName}</span>)}
          </>
        ) : restaurantRoles ? (
          <>
            {renderGroup("Operations", operationsItems)}
            {role === "owner" && renderGroup("Catalog", catalogItems)}
            {renderGroup(role === "owner" ? "Workspace" : "Your account", role === "owner" ? teamItems : operationalStaffItems)}
          </>
        ) : null}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-help-card">
          <span className="help-card-icon"><Activity size={15} /></span>
          <span><strong>Workspace ready</strong><small>Your tools are ready to use</small></span>
        </div>
        <div className="sidebar-account">
          <span className="account-avatar">{initials(displayName)}</span>
          <span className="account-meta"><strong>{displayName}</strong><small>{role === "admin" ? "Platform administrator" : role}</small></span>
          <span className="account-online-dot" aria-label="Online" />
        </div>
      </div>
    </aside>
  );
}