import { http } from "../../api/http";
import type { AdsListResponse, AdDetails, UpsertAdRequest, CreateAdResponse } from "./types";


export async function getAds(params?: {
  search?: string;
  categoryId?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
}) {
  const res = await http.get<AdsListResponse>("/ads", { params });
  return res.data;
}

export async function getAdById(id: string) {
  const res = await http.get(`/ads/${id}`);
  return res.data;
}

export async function createAd(body: UpsertAdRequest) {
  const res = await http.post<CreateAdResponse>("/ads", body);
  return res.data;
}

export async function updateAd(id: string, body: any) {
  await http.put(`/ads/${id}`, body);
}

export async function deleteAd(id: string) {
  await http.delete(`/ads/${id}`);
}

export type AdPhotoDto = { id: string; url: string; sortOrder: number };

export async function deleteAdPhoto(adId: string, photoId: string) {
  await http.delete(`/ads/${adId}/photos/${photoId}`);
}

export async function setMainAdPhoto(adId: string, photoId: string) {
  await http.put(`/ads/${adId}/photos/${photoId}/main`);
}

export async function uploadAdPhoto(adId: string, file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await http.post<{ url: string }>(`/ads/${adId}/photos`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data.url;
}

