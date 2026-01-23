import { request } from "@/lib/authFetch";

export type Category = { id: string; name: string };

export async function fetchCategories(): Promise<Category[]> {
  const { parsed } = await request("categories", { method: "GET" });
  return parsed;
}
