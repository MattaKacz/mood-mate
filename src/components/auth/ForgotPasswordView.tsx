import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordView() {
  return (
    <Card className="border-border/80 shadow-xl shadow-black/10">
      <CardHeader>
        <CardTitle className="text-2xl">Reset hasła</CardTitle>
        <CardDescription>Wpisz adres email. Jeśli konto istnieje, wyślemy link do resetu.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ForgotPasswordForm />
      </CardContent>
      <CardFooter className="flex-col gap-2 border-t border-border/60 pt-6 text-center text-sm text-muted-foreground">
        <a className="text-primary underline underline-offset-4" href="/login">
          Wróć do logowania
        </a>
      </CardFooter>
    </Card>
  );
}
