import { http } from "./http";

export type Category = {
  id: string;
  name: string;
  parentId?: string | null;
};

export async function getCategories() {
  const { data } = await http.get<Category[]>("/categories");
  return data;
}