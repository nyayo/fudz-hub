export const DELIVERY_STATUSES = ["pending", "assigned", "accepted", "declined", "picked_up", "delivered", "cancelled"] as const;
export type DeliveryStatus = typeof DELIVERY_STATUSES[number];

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  accepted: "Accepted",
  declined: "Declined",
  picked_up: "Picked up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export interface DeliveryOrder {
  id: number;
  dropoff_location?: string | null;
  placed_at?: string;
  status?: string;
}

export interface Delivery {
  id: number;
  order: DeliveryOrder;
  courier: number | null;
  courier_name?: string | null;
  courier_phone?: string | null;
  status: DeliveryStatus;
  pickup_coords?: { latitude: number; longitude: number } | null;
  dropoff_coords?: { latitude: number; longitude: number } | null;
  assigned_at?: string | null;
  updated_at: string;
}

export interface AvailableCourier {
  id: number;
  name: string;
  phone?: string | null;
  vehicle_type: "bike" | "motorcycle" | "car" | string;
  rating: number | string;
  total_deliveries: number;
}

export const NEXT_DELIVERY_STATUS: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  pending: "assigned",
  assigned: "accepted",
  accepted: "picked_up",
  picked_up: "delivered",
};
