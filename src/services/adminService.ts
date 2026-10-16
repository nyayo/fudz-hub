import { api } from "@/lib/api";
import type { Paginated } from "@/types/orders";
import type { Restaurant, RestaurantPayload } from "@/types/restaurant";

export interface AdminRestaurant extends Restaurant {
  owner_email: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  first_name: string;
  last_name: string;
  user_type: "customer" | "courier" | "restaurant" | "restaurant_staff";
  is_active: boolean;
  is_verified: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface AdminWishlistItem {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_email: string | null;
  restaurant_name: string;
  added_at: string;
  menu_item: {
    id: number;
    title: string;
    price: string;
    images?: Array<{ id: number; image: string }>;
    restaurant_name?: string;
    [key: string]: unknown;
  };
}

export interface AdminListParams {
  page?: number;
  search?: string;
  is_active?: boolean;
  is_approved?: boolean;
  user_type?: string;
}

export async function listAdminRestaurants(params: AdminListParams = {}) {
  const { data } = await api.get<Paginated<AdminRestaurant>>("/restaurants/admin/restaurants/", { params });
  return data;
}

export async function getAdminRestaurant(id: number): Promise<AdminRestaurant> {
  const { data } = await api.get<AdminRestaurant>(`/restaurants/admin/restaurants/${id}/`);
  return data;
}

export async function updateAdminRestaurant(id: number, payload: Partial<RestaurantPayload> & { is_approved?: boolean; latitude?: number | null; longitude?: number | null }) {
  const { data } = await api.patch<AdminRestaurant>(`/restaurants/admin/restaurants/${id}/`, payload);
  return data;
}

export async function listAdminUsers(params: AdminListParams = {}) {
  const { data } = await api.get<Paginated<AdminUser>>("/users/auth/admin/users/", { params });
  return data;
}

export async function updateAdminUser(id: number, payload: { is_active?: boolean; is_verified?: boolean }) {
  const { data } = await api.patch<AdminUser>(`/users/auth/admin/users/${id}/`, payload);
  return data;
}

export async function deleteAdminUser(id: number) {
  await api.delete(`/users/auth/admin/users/${id}/`);
}

export async function listAdminWishlists(params: Pick<AdminListParams, "page" | "search"> = {}) {
  const { data } = await api.get<Paginated<AdminWishlistItem>>("/wishlists/admin/items/", { params });
  return data;
}

export async function removeAdminWishlistItem(id: number) {
  await api.delete(`/wishlists/admin/items/${id}/`);
}
