import { api } from "@/lib/api";
import type { Paginated } from "@/types/orders";
import type { Restaurant, RestaurantPayload, Promotion, PromotionPayload } from "@/types/restaurant";

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
export async function listPromotions(params: { page?: number; search?: string } = {}): Promise<Paginated<Promotion>> {
  const { data } = await api.get<Paginated<Promotion>>("/restaurants/promotions/", {
    params: {
      page: params.page,
      ...(params.search ? { search: params.search } : {}),
    },
  });
  return data;
}

export async function createPromotion(payload: PromotionPayload): Promise<Promotion> {
  const { data } = await api.post<Promotion>("/restaurants/promotions/", payload);
  return data;
}

export async function updatePromotion(id: number, payload: Partial<PromotionPayload>): Promise<Promotion> {
  const { data } = await api.patch<Promotion>(`/restaurants/promotions/${id}/`, payload);
  return data;
}

export async function deletePromotion(id: number): Promise<void> {
  await api.delete(`/restaurants/promotions/${id}/`);
}

export async function uploadPromotionBanner(id: number, file: File): Promise<Promotion> {
  const fd = new FormData();
  fd.append("banner", file);
  const { data } = await api.patch<Promotion>(`/restaurants/promotions/${id}/`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// Menu item / category image uploads (used by Slice 3 dialogs)
export async function uploadMenuItemImage(itemId: number, file: File): Promise<unknown> {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("menu_item", String(itemId));
  const { data } = await api.post("/restaurants/images/", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function uploadCategoryImage(categoryId: number, file: File): Promise<unknown> {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("category", String(categoryId));
  const { data } = await api.post("/restaurants/images/", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
