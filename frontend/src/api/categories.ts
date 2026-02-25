import { http } from "./http";

export type Category = {
  id: string;
  name: string;
  parentId: string | null;
};

export async function getCategories(): Promise<Category[]> {
  const res = await http.get<Category[]>("/categories");
  return res.data;
}