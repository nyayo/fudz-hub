export const STAFF_ROLES = ["manager", "waiter", "cashier"] as const;
export type StaffRole = typeof STAFF_ROLES[number];

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  manager: "Manager",
  waiter: "Waiter",
  cashier: "Cashier",
};

export interface StaffMember {
  id: number;
  role: StaffRole;
  restaurant: number;
  is_active: boolean;
  // The list response only exposes these reliably:
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  user?: {
    id?: number;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface StaffCreatePayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: StaffRole;
  restaurant: number;
  is_active?: boolean;
}

export interface StaffUpdatePayload {
  role?: StaffRole;
  is_active?: boolean;
}