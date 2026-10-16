import { api } from "@/lib/api";
import type { Paginated } from "@/types/orders";
import type { Restaurant, RestaurantPayload, Promotion, PromotionPayload } from "@/types/restaurant";
import type { MenuItem } from "@/types/menu";

export async function listRestaurants(): Promise<Paginated<Restaurant>> {
  const { data } = await api.get<Paginated<Restaurant>>("/restaurants/restaurants/");
  return data;
}

export async function getRestaurant(id: number): Promise<Restaurant> {
  const { data } = await api.get<Restaurant>(`/restaurants/restaurants/${id}/`);
  return data;
}

export async function updateRestaurant(id: number, payload: RestaurantPayload): Promise<Restaurant> {
  const { data } = await api.patch<Restaurant>(`/restaurants/restaurants/${id}/`, payload);
  return data;
}

export async function uploadRestaurantImage(
  id: number,
  field: "image" | "logo",
  file: File,
): Promise<Restaurant> {
  const fd = new FormData();
  fd.append(field, file);
  const { data } = await api.patch<Restaurant>(`/restaurants/restaurants/${id}/`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// Promotions
export async function listPromotions(params: { page?: number; search?: string; restaurant_id?: number } = {}): Promise<Paginated<Promotion>> {
  const { data } = await api.get<Paginated<Promotion>>("/restaurants/promotions/", {
    params: {
      page: params.page,
      ...(params.restaurant_id ? { restaurant: params.restaurant_id } : {}),
      ...(params.search ? { search: params.search } : {}),
    },
  });
  return data;
}

export async function listActivePromotions(): Promise<Promotion[]> {
  const { data } = await api.get<Promotion[]>("/restaurants/promotions/active/");
  return data;
}

function promotionFormData(payload: Partial<PromotionPayload>, banner: File) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, String(value));
  });
  formData.append("banner", banner);
  return formData;
}

export async function createPromotion(payload: PromotionPayload, banner?: File): Promise<Promotion> {
  const body = banner ? promotionFormData(payload, banner) : payload;
  const { data } = await api.post<Promotion>("/restaurants/promotions/", body, banner ? { headers: { "Content-Type": "multipart/form-data" } } : undefined);
  return data;
}

export async function updatePromotion(id: number, payload: Partial<PromotionPayload>, banner?: File): Promise<Promotion> {
  const body = banner ? promotionFormData(payload, banner) : payload;
  const { data } = await api.patch<Promotion>(`/restaurants/promotions/${id}/`, body, banner ? { headers: { "Content-Type": "multipart/form-data" } } : undefined);
  return data;
}

export async function deletePromotion(id: number): Promise<void> {
  await api.delete(`/restaurants/promotions/${id}/`);
}

export async function uploadPromotionBanner(id: number, file: File): Promise<Promotion> {
  return updatePromotion(id, {}, file);
}

// The promotion's GET /menu_items/ action returns the promotion with its
// related items embedded. Backend serializer shape varies; we accept either
// `menu_items` or `items`, falling back to `results`.
export async function getPromotionMenuItems(id: number): Promise<MenuItem[]> {
  const { data } = await api.get<unknown>(`/restaurants/promotions/${id}/menu_items/`);
  const d = data as Record<string, unknown>;
  const candidates = [d?.menu_items, d?.items, d?.results, data];
  for (const c of candidates) {
    if (Array.isArray(c)) return c as MenuItem[];
  }
  return [];
}

// Menu item / category image uploads (used by Slice 3 dialogs)
export async function uploadMenuItemImage(itemId: number, file: File): Promise<unknown> {
  const fd = new FormData();
  fd.append("image", file);
  const { data } = await api.post(`/restaurants/items/${itemId}/images/`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function uploadCategoryImage(categoryId: number, file: File): Promise<unknown> {
  const fd = new FormData();
  fd.append("image", file);
  const category = (await api.get<{ restaurant: number }>(`/restaurants/categories/${categoryId}/`)).data;
  const restaurantId = category.restaurant;
  const { data } = await api.post(`/restaurants/restaurants/${restaurantId}/categories/${categoryId}/images/`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
