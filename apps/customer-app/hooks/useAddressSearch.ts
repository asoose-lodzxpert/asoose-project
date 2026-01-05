import { useEffect, useRef, useState } from "react";

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY!;
const cache = new Map<string, any[]>();

export function useAddressSearch(
  query: string,
  location?: { latitude: number; longitude: number }
) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    if (cache.has(query)) {
      setResults(cache.get(query)!);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);

      try {
        const bias = location
          ? `&location=${location.latitude},${location.longitude}&radius=30000`
          : "";

        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            query
          )}${bias}&components=country:ng&key=${API_KEY}`
        );

        const json = await res.json();

        const data =
          json.predictions?.map((p: any) => ({
            id: p.place_id,
            title: p.structured_formatting.main_text,
            subtitle: p.structured_formatting.secondary_text,
          })) ?? [];

        cache.set(query, data);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, location]);

  return { results, loading };
}
