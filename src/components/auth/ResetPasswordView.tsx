import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import UpdatePasswordForm from "./UpdatePasswordForm";

export default function ResetPasswordView() {
  return (
    <Card className="border-border/80 shadow-xl shadow-black/10">
      <CardHeader>
        <CardTitle className="text-2xl">Ustaw nowe hasło</CardTitle>
        <CardDescription>Otworzyłeś link z e-maila. Wpisz nowe hasło, aby zalogować się ponownie.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <UpdatePasswordForm />
      </CardContent>
      <CardFooter className="flex-col gap-2 border-t border-border/60 pt-6 text-center text-sm text-muted-foreground">
        <a className="text-primary underline underline-offset-4" href="/login">
          Wróć do logowania
        </a>
      </CardFooter>
    </Card>
  );
}
