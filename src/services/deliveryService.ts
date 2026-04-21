import { api } from "@/lib/api";
import type { Paginated } from "@/types/orders";
import type { Delivery, DeliveryStatus } from "@/types/delivery";

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

export async function updateDeliveryStatus(id: number, status: DeliveryStatus): Promise<Delivery> {
  const { data } = await api.patch<Delivery>(`/delivery/deliveries/${id}/`, { status });
  return data;
}

export async function assignDriver(id: number, driverName: string, driverPhone?: string): Promise<Delivery> {
  const { data } = await api.patch<Delivery>(`/delivery/deliveries/${id}/`, {
    driver_name: driverName,
    ...(driverPhone ? { driver_phone: driverPhone } : {}),
    status: "assigned",
  });
  return data;
}
