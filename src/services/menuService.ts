import { api } from "@/lib/api";
import type { Category, CategoryPayload, MenuItem, MenuItemPayload } from "@/types/menu";
import type { Paginated } from "@/types/orders";

export interface MenuListParams {
  page?: number;
  search?: string;
  category?: number | "all";
  is_available?: boolean;
}

export async function listMenuItems(params: MenuListParams = {}): Promise<Paginated<MenuItem>> {
  const { data } = await api.get<Paginated<MenuItem>>("/restaurants/items/", {
    params: {
      page: params.page,
      ...(params.search ? { search: params.search } : {}),
      ...(params.category && params.category !== "all" ? { category: params.category } : {}),
      ...(params.is_available !== undefined ? { is_available: params.is_available } : {}),
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

// Sequential bulk create with per-row error reporting. Swap to a true
// `/items/bulk/` endpoint here once the backend ships it.
export interface BulkCreateRowResult {
  index: number;
  title: string;
  ok: boolean;
  error?: string;
  item?: MenuItem;
}

export async function bulkCreateMenuItems(
  rows: MenuItemPayload[],
  onProgress?: (done: number, total: number) => void,
): Promise<BulkCreateRowResult[]> {
  const results: BulkCreateRowResult[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const item = await createMenuItem(row);
      results.push({ index: i, title: row.title, ok: true, item });
    } catch (err) {
      const msg =
        (err as { response?: { data?: unknown }; message?: string })?.response?.data
          ? JSON.stringify((err as { response: { data: unknown } }).response.data)
          : (err as Error)?.message ?? "Unknown error";
      results.push({ index: i, title: row.title, ok: false, error: msg });
    }
    onProgress?.(i + 1, rows.length);
  }
  return results;
}

export async function listCategories(params: { page?: number; search?: string } = {}): Promise<Paginated<Category>> {
  const { data } = await api.get<Paginated<Category>>("/restaurants/categories/", {
    params: {
      page: params.page,
      ...(params.search ? { search: params.search } : {}),
    },
  });
  return data;
}

export async function createCategory(payload: CategoryPayload): Promise<Category> {
  const { data } = await api.post<Category>("/restaurants/categories/", payload);
  return data;
}

export async function updateCategory(id: number, payload: Partial<CategoryPayload>): Promise<Category> {
  const { data } = await api.patch<Category>(`/restaurants/categories/${id}/`, payload);
  return data;
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/restaurants/categories/${id}/`);
}