import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { getAccessToken } from "@/services/auth.service";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function useAddressSearch(
  query: string,
  location?: { latitude: number; longitude: number },
) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params: any = { query };
        if (location) {
          params.latitude = location.latitude;
          params.longitude = location.longitude;
        }
        const token = await getAccessToken();
        const res = await axios.get(`${API_URL}/maps/address-search`, {
          params,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setResults(res.data);
      } catch (e) {
        if (__DEV__) console.error("Address search error:", e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, location]);
  return { results, loading };
}
