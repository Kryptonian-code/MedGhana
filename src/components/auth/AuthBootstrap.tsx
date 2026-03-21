import { useEffect } from "react";
import { getCurrentUser } from "@/lib/authApi";
import { useAuthStore } from "@/stores/authStore";

export function AuthBootstrap() {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      setLoading(true);

      try {
        const response = await getCurrentUser();

        if (isMounted) {
          setUser(response.user);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [setLoading, setUser]);

  return null;
}
