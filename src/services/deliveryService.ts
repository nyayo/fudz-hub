import { api } from "@/lib/api";
import type { Paginated } from "@/types/orders";
import type { AvailableCourier, Delivery, DeliveryStatus } from "@/types/delivery";

export interface DeliveryListParams {
  page?: number;
  search?: string;
  status?: DeliveryStatus | "all";
}

export async function listDeliveries(params: DeliveryListParams = {}): Promise<Paginated<Delivery>> {
  const { data } = await api.get<Paginated<Delivery>>("/delivery/deliveries/", {
    params: {
      page: params.page,
      ...(params.search ? { search: params.search } : {}),
      ...(params.status && params.status !== "all" ? { status: params.status } : {}),
    },
  });
  return data;
}

export async function getDelivery(id: number | string): Promise<Delivery> {
  const { data } = await api.get<Delivery>(`/delivery/deliveries/${id}/`);
  return data;
}

export async function listAvailableCouriers(): Promise<AvailableCourier[]> {
  const { data } = await api.get<AvailableCourier[] | Paginated<AvailableCourier>>(
    "/delivery/couriers/available/",
  );
  return Array.isArray(data) ? data : (data?.results ?? []);
}


export async function assignCourier(id: number, courierId: number): Promise<Delivery> {
  const { data } = await api.post<Delivery>(`/delivery/deliveries/${id}/assign/`, { courier_id: courierId });
  return data;
}

export async function completeDelivery(id: number): Promise<Delivery> {
  const { data } = await api.post<Delivery>(`/delivery/deliveries/${id}/complete/`);
  return data;
}
