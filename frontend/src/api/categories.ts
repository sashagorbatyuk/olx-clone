import { http } from "./http";

export type Category = {
  iconUrl: any;
  id: string;
  name: string;
  parentId?: string | null;
  iconUrl?: string | null;
};

export async function getCategories() {
  const { data } = await http.get<Category[]>("/categories");
  return data;
}