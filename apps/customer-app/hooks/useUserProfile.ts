import { useEffect, useState } from "react";
import { request } from "@/lib/authFetch";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
};

export function useUserProfile(): {
  user: UserProfile | null;
  loading: boolean;
  error: any;
} {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchProfile() {
      setLoading(true);
      setError(null);
      try {
        const data = await request("users/profile", { method: "GET" });
        if (mounted)
          setUser({
            id: data.id || data._id,
            name: data.name,
            email: data.email,
            phone: data.phone,
          });
      } catch (e) {
        if (mounted) setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading, error };
}
