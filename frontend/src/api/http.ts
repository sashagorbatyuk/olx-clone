import axios from "axios";
import { getToken } from "./auth";

function readToken(): string | null {
  return (
    localStorage.getItem("AUTH_TOKEN") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token")
  );
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5015",
});

http.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      console.log("401 Unauthorized. Token (first 40):", readToken()?.slice(0, 40));
    }
    return Promise.reject(err);
  }
);