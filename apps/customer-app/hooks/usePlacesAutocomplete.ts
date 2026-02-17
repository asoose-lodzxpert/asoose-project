import { useEffect, useRef, useState } from "react";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

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
        // Use Google Places Autocomplete API directly
        let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
        if (location) {
          url += `&location=${location}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.predictions || []);
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
