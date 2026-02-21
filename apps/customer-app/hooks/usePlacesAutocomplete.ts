import { useEffect, useRef, useState } from "react";
import { API_BASE } from "@/constants/static-config";

export function usePlacesAutocomplete(query: string, location?: string) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!query || query.length < 3) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        // Use backend endpoint for autocomplete
        let url = `${API_BASE}/maps/places-autocomplete?query=${encodeURIComponent(query)}`;
        if (location) {
          url += `&location=${location}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch (error) {
        if (__DEV__) console.error("Places autocomplete error:", error);
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
