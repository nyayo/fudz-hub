import { api } from "@/lib/api";
import type { Paginated } from "@/types/orders";
import type { StaffCreatePayload, StaffMember, StaffUpdatePayload } from "@/types/staff";

export async function listStaff(params: { page?: number; restaurant_id?: number } = {}): Promise<Paginated<StaffMember>> {
  const { data } = await api.get<Paginated<StaffMember>>("/users/auth/staff/", {
    params: { page: params.page, restaurant_id: params.restaurant_id },
  });
  return data;
}

export async function createStaff(payload: StaffCreatePayload): Promise<StaffMember> {
  const { data } = await api.post<StaffMember>("/users/auth/staff/", payload);
  return data;
}

export async function updateStaff(id: number, payload: StaffUpdatePayload): Promise<StaffMember> {
  const { data } = await api.patch<StaffMember>(`/users/auth/staff/${id}/`, payload);
  return data;
}

export async function deleteStaff(id: number): Promise<void> {
  await api.delete(`/users/auth/staff/${id}/`);
}
