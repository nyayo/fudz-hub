export const DELIVERY_STATUSES = ["pending", "assigned", "picked_up", "in_transit", "delivered", "cancelled"] as const;
export type DeliveryStatus = typeof DELIVERY_STATUSES[number];

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  picked_up: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export interface Delivery {
  id: number;
  order: number;
  order_id?: number;
  driver?: number | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  status: DeliveryStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  picked_up_at?: string | null;
  delivered_at?: string | null;
}

export const NEXT_DELIVERY_STATUS: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  pending: "assigned",
  assigned: "picked_up",
  picked_up: "in_transit",
  in_transit: "delivered",
};
