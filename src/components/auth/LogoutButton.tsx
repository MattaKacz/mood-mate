import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/components/hooks/useLogout";

interface LogoutButtonProps {
  redirectTo?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default";
}

export default function LogoutButton({ redirectTo, variant = "ghost", size = "sm" }: LogoutButtonProps) {
  const { logout, isLoggingOut, error, resetError } = useLogout({ defaultRedirect: redirectTo });
  const [hasTriedAgain, setHasTriedAgain] = useState(false);

  const handleClick = async () => {
    const success = await logout({ redirectTo });
    if (!success) {
      setHasTriedAgain(true);
    }
  };

  const handleRetry = async () => {
    resetError();
    setHasTriedAgain(false);
    await handleClick();
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant={variant} size={size} onClick={handleClick} disabled={isLoggingOut} aria-busy={isLoggingOut}>
        {isLoggingOut ? "Wylogowuję..." : "Wyloguj się"}
      </Button>
      {error && (
        <div className="text-sm text-destructive" role="alert">
          <p>Coś poszło nie tak podczas wylogowania.</p>
          <div className="mt-1 flex gap-2">
            <Button variant="link" size="sm" onClick={handleRetry} disabled={isLoggingOut}>
              Spróbuj ponownie
            </Button>
            {hasTriedAgain && (
              <span className="text-muted-foreground" aria-live="polite">
                {isLoggingOut ? "..." : ""}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
