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