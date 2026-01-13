import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { AuthSessionDTO } from "@/types";
import type { LoginFormValues } from "@/lib/viewmodels/auth/register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLoginMutation } from "@/components/hooks/useLoginMutation";
import { useRateLimitCooldown } from "@/components/hooks/useRateLimitCooldown";
import { useFocusOnFirstError } from "@/components/hooks/useFocusOnFirstError";
import RateLimitNotice from "./RateLimitNotice";
import TermsAndPrivacyLinks from "./TermsAndPrivacyLinks";

const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Podaj poprawny adres email" })
    .max(255, { message: "Email nie może mieć więcej niż 255 znaków" }),
  password: z
    .string()
    .min(8, { message: "Hasło musi mieć co najmniej 8 znaków" })
    .max(128, { message: "Hasło nie może mieć więcej niż 128 znaków" }),
});

interface LoginFormProps {
  onSuccess: (session: AuthSessionDTO) => Promise<void> | void;
  defaultEmail?: string;
}

export default function LoginForm({ onSuccess, defaultEmail = "" }: LoginFormProps) {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: defaultEmail,
      password: "",
    },
  });

  const { mutate, submitState, errorState, rateLimit } = useLoginMutation();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (errorState?.fieldErrors) {
      Object.entries(errorState.fieldErrors).forEach(([field, message]) => {
        if (message) {
          form.setError(field as keyof LoginFormValues, { message });
        }
      });
    }
  }, [errorState?.fieldErrors, form]);

  useEffect(() => {
    if (submitState === "success") {
      form.clearErrors();
    }
  }, [submitState, form]);

  useFocusOnFirstError(form);
  const remainingCooldownSeconds = useRateLimitCooldown(rateLimit);

  const handleSubmit = useCallback(
    async (values: LoginFormValues) => {
      setHasSubmitted(true);
      const result = await mutate(values);
      if (result?.data) {
        await onSuccess(result.data);
      }
    },
    [mutate, onSuccess]
  );

  const isSubmitDisabled = submitState === "submitting" || rateLimit.isLimited;
  const globalMessage = errorState?.globalMessage;

  return (
    <Form {...form}>
      <form
        className="space-y-6"
        data-testid="login-form"
        data-ready={isHydrated ? "true" : "false"}
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adres email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" inputMode="email" placeholder="ty@przyklad.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hasło</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" placeholder="Twoje hasło" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div aria-live="polite" aria-atomic="true" className="space-y-3">
          {globalMessage && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
              <AlertTitle>Coś poszło nie tak</AlertTitle>
              <AlertDescription>{globalMessage}</AlertDescription>
            </Alert>
          )}

          {rateLimit.isLimited && <RateLimitNotice remainingSeconds={remainingCooldownSeconds} />}
        </div>

        <Button
          className="w-full"
          disabled={isSubmitDisabled}
          type="submit"
          aria-live="polite"
          aria-busy={submitState === "submitting"}
        >
          {submitState === "submitting" ? "Loguję..." : rateLimit.isLimited ? "Poczekaj chwilę" : "Zaloguj się"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Kontynuując akceptujesz nasz <TermsAndPrivacyLinks />.
        </p>

        {hasSubmitted && submitState === "success" && (
          <p className="text-center text-sm text-muted-foreground" role="status">
            Zalogowano. Przekierowuję...
          </p>
        )}
      </form>
    </Form>
  );
}
