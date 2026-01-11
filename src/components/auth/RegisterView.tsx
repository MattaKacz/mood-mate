import { useCallback, useMemo } from "react";
import type { AuthSessionDTO } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import RegisterForm from "./RegisterForm";
import AuthSecondaryLinks from "./AuthSecondaryLinks";
import type { RegisterSuccessAction } from "@/lib/viewmodels/auth/register";

interface RegisterViewProps {
  initialRedirectTo?: string;
}

const DEFAULT_REDIRECT = "/app/ftue";

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

export default function RegisterView({ initialRedirectTo }: RegisterViewProps) {
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
      // Backend już ustawił httpOnly cookies (mm_access_token, mm_refresh_token)
      // Dodajemy krótkie opóźnienie, aby zagwarantować że przeglądarka przetworzyła
      // Set-Cookie headers z odpowiedzi przed wykonaniem przekierowania
      setTimeout(() => {
        window.location.href = successAction.redirectTo;
      }, 100);
    },
    [successAction]
  );

  return (
    <Card className="border-border/80 shadow-xl shadow-black/10">
      <CardHeader>
        <CardTitle className="text-2xl">Załóż konto</CardTitle>
        <CardDescription>Prowadź prywatny dziennik i otrzymuj empatyczne wskazówki.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RegisterForm onSuccess={handleSuccess} successAction={successAction} />
      </CardContent>
      <CardFooter className="flex-col gap-2 border-t border-border/60 pt-6">
        <AuthSecondaryLinks />
      </CardFooter>
    </Card>
  );
}
