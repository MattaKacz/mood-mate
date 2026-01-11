import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { defaultPasswordPolicy, type PasswordPolicyVM } from "@/lib/viewmodels/auth/register";
import PasswordStrengthHint from "./PasswordStrengthHint";
import { useFocusOnFirstError } from "@/components/hooks/useFocusOnFirstError";

const createUpdatePasswordSchema = (policy: PasswordPolicyVM) =>
  z
    .object({
      password: z
        .string()
        .min(policy.minLength, { message: `Hasło musi mieć co najmniej ${policy.minLength} znaków` })
        .max(policy.maxLength, { message: `Hasło nie może mieć więcej niż ${policy.maxLength} znaków` }),
      confirmPassword: z.string(),
    })
    .refine((value) => value.password === value.confirmPassword, {
      message: "Hasła muszą być identyczne",
      path: ["confirmPassword"],
    });

type UpdatePasswordValues = z.infer<ReturnType<typeof createUpdatePasswordSchema>>;
type SubmitState = "idle" | "submitting" | "success" | "error";

const copy = {
  labels: {
    password: "Nowe hasło",
    confirmPassword: "Powtórz hasło",
  },
  placeholders: {
    password: "Wpisz nowe hasło",
    confirmPassword: "Powtórz nowe hasło",
  },
  info: "Formularz działa tylko po otwarciu linku resetującego z e-maila.",
  success: "Hasło zostało zmienione. Możesz zalogować się nowym hasłem.",
  error: "Nie udało się zaktualizować hasła. Spróbuj ponownie.",
  button: {
    default: "Ustaw nowe hasło (tryb demo)",
    submitting: "Zapisuję… (tryb demo)",
    success: "Zmieniono (tryb demo)",
  },
};

export default function UpdatePasswordForm() {
  const passwordPolicy = useMemo(() => defaultPasswordPolicy, []);
  const updatePasswordSchema = useMemo(() => createUpdatePasswordSchema(passwordPolicy), [passwordPolicy]);

  const form = useForm<UpdatePasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useFocusOnFirstError(form);

  const handleSubmit = useCallback(async (_values: UpdatePasswordValues) => {
    void _values;
    setGlobalError(null);
    setSubmitState("submitting");

    try {
      // UI-only: zastąp tym fragmentem wywołanie faktycznego endpointu /api/auth/update-password
      await new Promise((resolve) => setTimeout(resolve, 700));
      setSubmitState("success");
    } catch (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error("[UpdatePasswordForm] failed to submit new password", error);
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
        data-testid="update-password-form"
        data-ready={isHydrated ? "true" : "false"}
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{copy.labels.password}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder={copy.placeholders.password}
                    disabled={isSubmitting || isSuccess}
                    {...field}
                  />
                </FormControl>
                <PasswordStrengthHint policy={passwordPolicy} currentPassword={field.value} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{copy.labels.confirmPassword}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder={copy.placeholders.confirmPassword}
                    disabled={isSubmitting || isSuccess}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div aria-live="polite" aria-atomic="true" className="space-y-3">
          <p className="text-sm text-muted-foreground">{copy.info}</p>

          {globalError && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
              <AlertTitle>Coś poszło nie tak</AlertTitle>
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}

          {isSuccess && (
            <Alert className="border-emerald-500/50 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-950/30 dark:text-emerald-50">
              <AlertTitle>Hasło zmienione</AlertTitle>
              <AlertDescription>{copy.success}</AlertDescription>
            </Alert>
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
