import { useCallback, useState } from "react";
import { logout } from "@/lib/services/auth/logout.client";

interface UseLogoutOptions {
  defaultRedirect?: string;
}

interface LogoutParams {
  redirectTo?: string;
}

export function useLogout(options?: UseLogoutOptions) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performLogout = useCallback(
    async (params?: LogoutParams) => {
      setIsLoggingOut(true);
      setError(null);

      const success = await logout();

      setIsLoggingOut(false);

      if (!success) {
        setError("Nie udało się wylogować. Spróbuj ponownie.");
        return false;
      }

      const redirectTarget = params?.redirectTo ?? options?.defaultRedirect ?? "/login";
      window.location.assign(redirectTarget);
      return true;
    },
    [options?.defaultRedirect]
  );

  const resetError = useCallback(() => setError(null), []);

  return {
    logout: performLogout,
    isLoggingOut,
    error,
    resetError,
  };
}
