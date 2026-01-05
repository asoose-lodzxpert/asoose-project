import { ITEMS } from "@/types/item";
import { paginate } from "@/lib/pagination";

export function filterRestaurants(category: string) {
  if (category === "all") return ITEMS;
  return ITEMS.filter((r) => r.category === category);
}

export function getPagedRestaurants(
  category: string,
  page: number,
  pageSize: number = 6
) {
  const filtered = filterRestaurants(category);
  return paginate(filtered, page, pageSize);
}
