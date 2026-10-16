export const ORDER_STATUSES = ["placed", "accepted", "ready", "picked_up", "delivered", "cancelled"] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = typeof PAYMENT_STATUSES[number];

export interface SimpleMenu {
  id: number;
  name?: string;
  title?: string;
  image?: string | null;
  images?: Array<{ id?: number; image: string }>;
  price?: string;
}

export interface OrderItem {
  id: number;
  menu_item: SimpleMenu;
  qty: number;
  unit_price: string;
  original_price?: string | null;
  discount_amount?: string;
  promotion?: { id: number; name: string; discount: number | null } | null;
}

export interface Order {
  id: number;
  customer: number;
  customer_name?: string | null;
  restaurant: number;
  restaurant_name?: string | null;
  pickup_location?: string | null | { type?: string; coordinates?: [number, number]; latitude?: number; longitude?: number; lat?: number; lng?: number };
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  dropoff_location?: string | null | { type?: string; coordinates?: [number, number]; latitude?: number; longitude?: number; lat?: number; lng?: number };
  dropoff_latitude?: number | null;
  dropoff_longitude?: number | null;
  placed_at: string;
  status: OrderStatus;
  payment_status?: PaymentStatus;
  total_price?: string;
  delivery_fee?: string;
  tax?: string;
  items: OrderItem[];
  total_discount: number;
  total_amount: number;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  accepted: "Accepted",
  ready: "Ready",
  picked_up: "Picked up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: "accepted",
  accepted: "ready",
  ready: "picked_up",
  picked_up: "delivered",
};
