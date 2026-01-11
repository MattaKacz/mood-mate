interface AuthSecondaryLinksProps {
  mode?: "register" | "login";
}

export default function AuthSecondaryLinks({ mode = "register" }: AuthSecondaryLinksProps) {
  const isLogin = mode === "login";

  return (
    <div className="text-center text-sm text-muted-foreground">
      {isLogin ? (
        <>
          Nie masz konta?{" "}
          <a className="text-primary underline underline-offset-4" href="/register">
            Załóż je
          </a>
        </>
      ) : (
        <>
          Masz już konto?{" "}
          <a className="text-primary underline underline-offset-4" href="/login">
            Zaloguj się
          </a>
        </>
      )}
      <p className="mt-1">
        <a className="text-muted-foreground underline underline-offset-4" href="/forgot-password">
          Zapomniałeś hasła?
        </a>
      </p>
    </div>
  );
}
