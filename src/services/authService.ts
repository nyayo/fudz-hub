import { api } from "@/lib/api";
import type { AuthUser } from "@/contexts/AuthContext";

export interface VerifyOtpResponse {
  message: string;
  verified: boolean;
  user_exists: boolean;
  requires_registration: boolean;
  user?: AuthUser;
  email?: string;
  tokens?: { access: string; refresh: string };
  can_link_google?: boolean;
}

export interface RegisterPayload {
  email: string;
  first_name: string;
  last_name: string;
  user_type: "restaurant";
  password: string;
  password2: string;
  restaurant_name: string;
  business_license: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface NotificationPreferences {
  id?: number;
  receive_push: boolean;
  receive_email: boolean;
  promotions_and_offers: boolean;
  new_restaurants: boolean;
  review_reminders: boolean;
}

export interface UserProfile {
  id: number;
  username: string;
  full_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  user_type: string;
  profile: Record<string, unknown> | null;
  needs_phone: boolean;
  needs_email: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
}

export async function requestOtp(email: string) {
  const { data } = await api.post("/users/auth/request-otp/", { email });
  return data;
}

export async function verifyOtp(email: string, otp: string): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>("/users/auth/verify-otp/", { email, otp });
  return data;
}

export async function registerRestaurant(payload: RegisterPayload): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>("/users/auth/register/", payload);
  return data;
}

export async function logoutApi(refreshToken: string): Promise<void> {
  await api.post("/users/auth/logout/", { refresh_token: refreshToken });
}

export async function getUserProfile(): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>("/users/auth/profile/");
  return data;
}

export async function updateUserProfile(payload: Partial<Pick<UserProfile, "phone" | "first_name" | "last_name">>): Promise<UserProfile> {
  const { data } = await api.put<UserProfile>("/users/auth/profile/", payload);
  return data;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data } = await api.get<NotificationPreferences>("/users/auth/notification-preferences/");
  return data;
}

export async function updateNotificationPreferences(payload: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  const { data } = await api.patch<NotificationPreferences>("/users/auth/notification-preferences/", payload);
  return data;
}
