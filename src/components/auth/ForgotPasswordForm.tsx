import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useFocusOnFirstError } from "@/components/hooks/useFocusOnFirstError";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Podaj poprawny adres email" })
    .max(255, { message: "Email nie może mieć więcej niż 255 znaków" }),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
type SubmitState = "idle" | "submitting" | "success" | "error";

const copy = {
  labels: {
    email: "Adres email",
  },
  placeholders: {
    email: "ty@przyklad.com",
  },
  button: {
    default: "Wyślij link resetujący (tryb demo)",
    submitting: "Wysyłam… (tryb demo)",
    success: "Wysłano (tryb demo)",
  },
  info: "Jeśli konto istnieje, wysłaliśmy link do resetu na ten adres.",
  success: "Sprawdź skrzynkę pocztową – link resetujący jest już w drodze.",
  error: "Nie udało się wysłać prośby. Spróbuj ponownie za chwilę.",
};

export default function ForgotPasswordForm() {
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useFocusOnFirstError(form);

  const handleSubmit = useCallback(async (_values: ForgotPasswordValues) => {
    void _values;
    setGlobalError(null);
    setSubmitState("submitting");

    try {
      // UI-only: zastąp tym fragmentem wywołanie faktycznego endpointu /api/auth/reset-request
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSubmitState("success");
    } catch (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error("[ForgotPasswordForm] failed to submit reset request", error);
      }
      setGlobalError(copy.error);
      setSubmitState("error");
    }
  }, []);

  const isSubmitting = submitState === "submitting";
  const isSuccess = submitState === "success";

  return (
    <Form {...form}>
      <form
        className="space-y-6"
        data-testid="forgot-password-form"
        data-ready={isHydrated ? "true" : "false"}
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{copy.labels.email}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder={copy.placeholders.email}
                  disabled={isSubmitting || isSuccess}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div aria-live="polite" aria-atomic="true" className="space-y-3">
          {globalError && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
              <AlertTitle>Coś poszło nie tak</AlertTitle>
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}

          {isSuccess ? (
            <Alert className="border-emerald-500/50 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-950/30 dark:text-emerald-50">
              <AlertTitle>Wysłaliśmy instrukcje</AlertTitle>
              <AlertDescription>{copy.success}</AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-muted-foreground">{copy.info}</p>
          )}
        </div>

        <Button
          className="w-full"
          disabled={isSubmitting || isSuccess}
          type="submit"
          aria-live="polite"
          aria-busy={isSubmitting}
        >
          {isSubmitting ? copy.button.submitting : isSuccess ? copy.button.success : copy.button.default}
        </Button>
      </form>
    </Form>
  );
}
