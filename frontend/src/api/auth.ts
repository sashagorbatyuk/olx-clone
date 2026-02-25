// src/api/auth.ts
const KEY = "AUTH_TOKEN";

export function setToken(token: string) {
  localStorage.setItem(KEY, token);
}

export function getToken() {
  return localStorage.getItem(KEY);
}

export function clearToken() {
  localStorage.removeItem(KEY);
}

export function isAuthed(): boolean {
  const t =
    localStorage.getItem("AUTH_TOKEN") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");
  return !!t;
}

export function getMyUserIdFromToken(): string | null {
  const token = localStorage.getItem("AUTH_TOKEN");
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload?.sub ?? payload?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ?? null;
  } catch {
    return null;
  }
}

import { http } from "./http";

export async function loginWithGoogle(idToken: string) {
  const { data } = await http.post("/auth/google", { idToken });
  return data as { token: string };
}