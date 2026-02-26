import { http } from "./http";

export type Paged<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type MeDto = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  about: string | null;
  avatarUrl: string | null;
  createdAt: string;

  ratingAvg: number | null;
  ratingCount: number;
  recentReviews: {
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    raterName: string;
  }[];
};

// GET /users/me
export async function getMe() {
  const { data } = await http.get<MeDto>("/users/me");
  return data;
}


// POST /users/me/avatar  (multipart/form-data)
export async function uploadMyAvatar(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await http.post("/users/me/avatar", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// GET /users/me/ads?page=&pageSize=
export async function getMyAds<T>(page = 1, pageSize = 50) {
  const { data } = await http.get<Paged<T>>("/users/me/ads", {
    params: { page, pageSize },
  });
  return data;
}

export type PublicUserDto = {
  id: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  about: string | null; // ✅
  createdAt?: string;   // якщо віддаєш
};

export async function getUser(id: string) {
  const { data } = await http.get<PublicUserDto>(`/users/${id}`);
  return data;
}

export async function updateMe(payload: { name: string; phone: string | null; about: string | null }) {
  const { data } = await http.put("/users/me", payload);
  return data;
}