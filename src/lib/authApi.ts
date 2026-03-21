import { apiRequest } from "@/lib/api";
import type { AuthUser } from "@/types";

interface AuthResponse {
  user: AuthUser;
  message?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface OwnerLoginPayload {
  username: string;
  password: string;
}

export interface SignupPayload {
  hospital_name: string;
  hospital_code?: string;
  branch_name: string;
  admin_name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

export function login(payload: LoginPayload) {
  return apiRequest<AuthResponse>("/auth/login.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function ownerLogin(payload: OwnerLoginPayload) {
  return apiRequest<AuthResponse>("/auth/owner-login.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCurrentUser() {
  return apiRequest<AuthResponse>("/auth/me.php");
}

export function signup(payload: SignupPayload) {
  return apiRequest<AuthResponse>("/auth/signup.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return apiRequest<{ message: string }>("/auth/logout.php", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
