import { api } from "@/lib/api";
import type { Order, OrderStatus, Paginated } from "@/types/orders";

export interface ListParams {
  page?: number;
  status?: OrderStatus | "all";
  search?: string;
}

export async function listOrders(params: ListParams = {}): Promise<Paginated<Order>> {
  const { data } = await api.get<Paginated<Order>>("/orders/orders/", {
    params: {
      page: params.page,
      ...(params.status && params.status !== "all" ? { status: params.status } : {}),
      ...(params.search ? { search: params.search } : {}),
    },
  });
  return data;
}

export async function getOrder(id: number | string): Promise<Order> {
  const { data } = await api.get<Order>(`/orders/orders/${id}/`);
  return data;
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
  const { data } = await api.patch<Order>(`/orders/orders/${id}/`, { status });
  return data;
}

export async function acceptOrder(id: number): Promise<Order> {
  const { data } = await api.post<Order>(`/orders/orders/${id}/accept/`, {});
  return data;
}
