import { API_BASE } from "@/constants/static-config";

export async function resolveAddress(coords: {
  latitude: number;
  longitude: number;
}) {
  try {
    const url = `${API_BASE}/maps/reverse-geocode?lat=${coords.latitude}&lng=${coords.longitude}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data || !data.address) return null;
    return {
      label: "Current location",
      address: data.address,
    };
  } catch {
    return null;
  }
}
