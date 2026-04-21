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

export async function requestOtp(email: string) {
  const { data } = await api.post("/users/auth/request-otp/", { email });
  return data;
}

export async function verifyOtp(email: string, otp: string): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>("/users/auth/verify-otp/", { email, otp });
  return data;
}