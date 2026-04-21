export const ORDER_STATUSES = ["placed", "accepted", "ready", "picked_up", "delivered", "cancelled"] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = typeof PAYMENT_STATUSES[number];

export interface SimpleMenu {
  id: number;
  name?: string;
  image?: string | null;
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
  restaurant: number;
  pickup_location?: string | null;
  dropoff_location?: string | null;
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
