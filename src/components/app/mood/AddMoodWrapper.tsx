import { useEffect, useState } from "react";
import { AddMoodForm } from "./AddMoodForm";
import { Alert } from "@/components/ui/alert";

export function AddMoodWrapper() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated by trying a simple request
    fetch("/api/dashboard/summary", {
      method: "GET",
      credentials: "same-origin",
    })
      .then((response) => {
        if (response.status === 401) {
          // User is not authenticated, redirect to login
          window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        if (!response.ok) {
          setAuthError("Nie można sprawdzić sesji. Spróbuj odświeżyć stronę.");
        }
        setIsCheckingAuth(false);
      })
      .catch(() => {
        setAuthError("Problem z połączeniem. Sprawdź swoje połączenie internetowe.");
        setIsCheckingAuth(false);
      });
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Sprawdzam sesję...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <Alert className="border-destructive/50 bg-destructive/10">
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden="true">
            ⚠️
          </span>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold text-destructive">Problem z autoryzacją</p>
            <p className="text-sm text-muted-foreground">{authError}</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg border border-border/60 bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                Odśwież stronę
              </button>
              <a
                href="/login"
                className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Przejdź do logowania
              </a>
            </div>
          </div>
        </div>
      </Alert>
    );
  }

  return <AddMoodForm />;
}
