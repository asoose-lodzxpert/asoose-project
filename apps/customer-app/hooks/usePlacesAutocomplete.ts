import axios from "axios";
import { useEffect, useRef, useState } from "react";

// IMPORTANT: Ensure the protocol (http/https) matches your backend server.
// For local development, use http://localhost:3000
// If deploying to production with SSL, set EXPO_PUBLIC_API_URL to https://yourdomain.com
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

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
        const params: any = { query };
        if (location) params.location = location;
        const res = await axios.get(`${API_URL}/maps/places-autocomplete`, {
          params,
        });
        setResults(res.data);
      } catch {
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
