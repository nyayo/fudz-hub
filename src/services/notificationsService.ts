import { api } from "@/lib/api";

export interface InboxNotification {
  id: number;
  event_type: "new_order" | "order_update" | string;
  message: string;
  order_id: number | null;
  created_at: string;
  is_read: boolean;
  restaurant_name?: string | null;
  customer_name?: string | null;
  status?: string | null;
}

export interface NotificationInbox {
  count: number;
  unread_count: number;
  results: InboxNotification[];
}

export async function getNotifications(): Promise<NotificationInbox> {
  const { data } = await api.get<NotificationInbox>("/orders/notifications/");
  return data;
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.post(`/orders/notifications/${id}/read/`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/orders/notifications/mark-all-read/");
}

export async function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post<{ success: boolean; message: string }>("/users/auth/notification/test/", {
    title: "FoGo Merchant test",
    message: "Your notification connection is ready.",
    data: { source: "dashboard-test" },
  });
  return data;
}