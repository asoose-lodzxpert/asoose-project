import { request } from "@/lib/authFetch";

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  link: string;
  image: string | null;
  type: string;
  priority: number;
  isActive: boolean;
}

export async function fetchActiveBanners(): Promise<Banner[]> {
  const data = await request("marketplace/banners");
  return Array.isArray(data) ? data : [];
}
