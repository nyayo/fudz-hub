import { api } from "@/lib/api";
import type { Category, CategoryPayload, MenuItem, MenuItemPayload } from "@/types/menu";
import type { Paginated } from "@/types/orders";

export interface MenuListParams {
  page?: number;
  search?: string;
  category?: number | "all";
  is_available?: boolean;
  restaurant_id?: number;
}

async function getOwnerRestaurantId(): Promise<number> {
  const { data } = await api.get<{ profile?: { id?: number; restaurant_id?: number } }>("/users/auth/profile/");
  const id = data.profile?.restaurant_id ?? data.profile?.id;
  if (!id) throw new Error("This account is not linked to a restaurant workspace.");
  return id;
}

export async function listMenuItems(params: MenuListParams = {}): Promise<Paginated<MenuItem>> {
  const { data } = await api.get<Paginated<MenuItem>>("/restaurants/items/", {
    params: {
      page: params.page,
      ...(params.search ? { search: params.search } : {}),
      ...(params.category && params.category !== "all" ? { category: params.category } : {}),
      ...(params.is_available !== undefined ? { is_available: params.is_available } : {}),
      ...(params.restaurant_id ? { restaurant_id: params.restaurant_id } : {}),
    },
  });
  return data;
}

export async function getMenuItem(id: number | string): Promise<MenuItem> {
  const { data } = await api.get<MenuItem>(`/restaurants/items/${id}/`);
  return data;
}

export async function createMenuItem(payload: MenuItemPayload): Promise<MenuItem> {
  const { data } = await api.post<MenuItem>("/restaurants/items/", payload);
  return data;
}

export async function updateMenuItem(id: number, payload: Partial<MenuItemPayload>): Promise<MenuItem> {
  const { data } = await api.patch<MenuItem>(`/restaurants/items/${id}/`, payload);
  return data;
}

export async function deleteMenuItem(id: number): Promise<void> {
  await api.delete(`/restaurants/items/${id}/`);
}

// Update the writable `promotion_ids` field on a menu item.
export async function setMenuItemPromotions(
  itemId: number,
  promotionIds: number[],
): Promise<MenuItem> {
  const { data } = await api.patch<MenuItem>(`/restaurants/items/${itemId}/`, {
    promotion_ids: promotionIds,
  });
  return data;
}

export interface BulkMenuItemPayload extends MenuItemPayload {
  /** Existing item ID; omitted rows are upserted by exact title. */
  id?: number;
}

export interface BulkImportRowResult {
  index: number;
  title: string;
  ok: boolean;
  action?: "created" | "updated";
  error?: string;
  item?: MenuItem;
}

interface BulkImportResponse {
  results: Array<{
    index: number;
    title: string;
    ok: boolean;
    action?: "created" | "updated";
    error?: unknown;
    item?: MenuItem;
  }>;
}

/** Create/update a CSV batch while always binding every row to one restaurant. */
export async function bulkUpsertMenuItems(
  rows: BulkMenuItemPayload[],
  onProgress?: (done: number, total: number) => void,
  restaurantId?: number,
): Promise<BulkImportRowResult[]> {
  if (!rows.length) return [];
  const scopedRestaurantId = restaurantId ?? await getOwnerRestaurantId();
  onProgress?.(0, rows.length);
  const { data } = await api.post<BulkImportResponse>("/restaurants/items/bulk/", {
    restaurant: scopedRestaurantId,
    items: rows,
  });
  onProgress?.(rows.length, rows.length);
  return data.results.map((row, index) => ({
    index: row.index ?? index,
    title: row.title || rows[row.index ?? index]?.title || "Menu item",
    ok: row.ok,
    action: row.action,
    item: row.item,
    error: row.error == null
      ? undefined
      : typeof row.error === "string"
        ? row.error
        : JSON.stringify(row.error),
  }));
}

export async function listCategories(params: { page?: number; search?: string; restaurant_id?: number } = {}): Promise<Paginated<Category>> {
  const restaurantId = params.restaurant_id ?? await getOwnerRestaurantId();
  const { data } = await api.get<Paginated<Category>>("/restaurants/categories/", {
    params: {
      page: params.page,
      restaurant: restaurantId,
      ...(params.search ? { search: params.search } : {}),
    },
  });
  return data;
}

export async function createCategory(payload: CategoryPayload, selectedRestaurantId?: number): Promise<Category> {
  const restaurantId = selectedRestaurantId ?? await getOwnerRestaurantId();
  const body = selectedRestaurantId ? { ...payload, restaurant: selectedRestaurantId } : payload;
  const { data } = await api.post<Category>(`/restaurants/restaurants/${restaurantId}/categories/`, body);
  return data;
}

export async function updateCategory(id: number, payload: Partial<CategoryPayload>, selectedRestaurantId?: number): Promise<Category> {
  const restaurantId = selectedRestaurantId ?? await getOwnerRestaurantId();
  const { data } = await api.patch<Category>(`/restaurants/restaurants/${restaurantId}/categories/${id}/`, payload);
  return data;
}

export async function deleteCategory(id: number, selectedRestaurantId?: number): Promise<void> {
  const restaurantId = selectedRestaurantId ?? await getOwnerRestaurantId();
  await api.delete(`/restaurants/restaurants/${restaurantId}/categories/${id}/`);
}
