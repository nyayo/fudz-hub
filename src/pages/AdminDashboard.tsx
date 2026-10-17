import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bike, Heart, MessageSquareText, ShoppingBag, Store, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listOrders } from "@/services/ordersService";
import { listDeliveries } from "@/services/deliveryService";
import { listReviews } from "@/services/reviewsService";
import { listAdminRestaurants, listAdminUsers, listAdminWishlists } from "@/services/adminService";

const shortcuts = [
  { title: "Restaurants", href: "/admin/restaurants", icon: Store, description: "Review onboarding and operating status." },
  { title: "Orders", href: "/orders", icon: ShoppingBag, description: "Monitor and manage every restaurant order." },
  { title: "Users", href: "/admin/users", icon: Users, description: "Review accounts and control access." },
  { title: "Deliveries", href: "/deliveries", icon: Bike, description: "Assign couriers and resolve delivery work." },
  { title: "Reviews", href: "/reviews", icon: MessageSquareText, description: "Moderate and respond to customer feedback." },
  { title: "Wishlists", href: "/admin/wishlists", icon: Heart, description: "Inspect customer saved items across the platform." },
];

export default function AdminDashboard() {
  const restaurants = useQuery({ queryKey: ["admin", "restaurants", "summary"], queryFn: () => listAdminRestaurants({ page: 1 }) });
  const orders = useQuery({ queryKey: ["orders", { page: 1, admin: true }], queryFn: () => listOrders({ page: 1 }) });
  const users = useQuery({ queryKey: ["admin", "users", "summary"], queryFn: () => listAdminUsers({ page: 1 }) });
  const deliveries = useQuery({ queryKey: ["deliveries", { page: 1, admin: true }], queryFn: () => listDeliveries({ page: 1 }) });
  const reviews = useQuery({ queryKey: ["admin", "reviews", "summary"], queryFn: () => listReviews({ page: 1 }) });
  const wishlists = useQuery({ queryKey: ["admin", "wishlists", "summary"], queryFn: () => listAdminWishlists({ page: 1 }) });
  const summaryLoading = [restaurants, orders, users, deliveries, reviews, wishlists].some((query) => query.isLoading);
  const metrics = [
    { label: "Restaurants", value: restaurants.data?.count, icon: Store, hint: restaurants.isError ? "Unavailable" : "Across the platform" },
    { label: "Orders", value: orders.data?.count, icon: ShoppingBag, hint: "All statuses" },
    { label: "User accounts", value: users.data?.count, icon: Users, hint: "Customers, couriers and teams" },
    { label: "Deliveries", value: deliveries.data?.count, icon: Bike, hint: "All delivery requests" },
    { label: "Reviews", value: reviews.data?.count, icon: MessageSquareText, hint: "Customer feedback" },
    { label: "Wishlist items", value: wishlists.data?.count, icon: Heart, hint: "Customer saves" },
  ];
  return <div className="page-stack max-w-7xl">
    <header className="page-heading"><div><p className="eyebrow">PLATFORM CONTROL</p><h1>Admin overview</h1><p>One workspace for restaurant operations, customer accounts, and platform activity.</p></div><span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-semibold text-orange-800"><Activity size={14}/> Platform admin</span></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((m) => <Card key={m.label} className="metric-tile"><span className="metric-icon"><m.icon size={17}/></span><div><small>{m.label}</small>{m.value === undefined && summaryLoading ? <Skeleton className="mt-1 h-6 w-14"/> : <strong>{m.value?.toLocaleString() ?? "—"}</strong>}<span className="table-subline">{m.hint}</span></div></Card>)}
    </section>
    <section><div className="mb-3"><h2 className="text-lg font-semibold">Management areas</h2><p className="text-sm text-muted-foreground">Select a workspace to review records and take action.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{shortcuts.map((item) => <Link key={item.title} to={item.href} className="group"><Card className="h-full p-5 transition hover:-translate-y-0.5 hover:shadow-md"><div className="mb-4 flex items-center justify-between"><span className="metric-icon"><item.icon size={18}/></span><span className="text-sm text-muted-foreground transition group-hover:translate-x-1">→</span></div><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm text-muted-foreground">{item.description}</p></Card></Link>)}</div></section>
  </div>;
}