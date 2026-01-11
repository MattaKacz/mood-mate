import { useCallback, useMemo } from "react";
import type { AuthSessionDTO } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import LoginForm from "./LoginForm";
import AuthSecondaryLinks from "./AuthSecondaryLinks";
import type { RegisterSuccessAction } from "@/lib/viewmodels/auth/register";

interface LoginViewProps {
  initialRedirectTo?: string;
}

const DEFAULT_REDIRECT = "/app/dashboard";

function sanitizeRedirect(target?: string): string {
  if (!target) {
    return DEFAULT_REDIRECT;
  }

  const trimmed = target.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return DEFAULT_REDIRECT;
  }

  return trimmed;
}

export default function LoginView({ initialRedirectTo }: LoginViewProps) {
  const redirectTarget = sanitizeRedirect(initialRedirectTo);

  const successAction = useMemo<RegisterSuccessAction>(
    () => ({
      redirectTo: redirectTarget,
      persistSession: "server_cookie",
    }),
    [redirectTarget]
  );

  const handleSuccess = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_session: AuthSessionDTO) => {
      // Supabase SSR ustawia httpOnly cookies w odpowiedzi;
      // krótka pauza pozwala przeglądarce je zapisać przed przekierowaniem.
      setTimeout(() => {
        window.location.href = successAction.redirectTo;
      }, 100);
    },
    [successAction]
  );

  return (
    <Card blur className="border-border/80 shadow-xl shadow-black/10">
      <CardHeader>
        <CardTitle className="text-2xl">Witaj ponownie</CardTitle>
        <CardDescription>Zaloguj się, aby kontynuować prywatną podróż z MoodMate.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <LoginForm onSuccess={handleSuccess} />
      </CardContent>
      <CardFooter className="flex-col gap-2 border-t border-border/60 pt-6">
        <AuthSecondaryLinks mode="login" />
      </CardFooter>
    </Card>
  );
}
