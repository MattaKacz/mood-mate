import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { AuthSessionDTO } from "@/types";
import {
  defaultPasswordPolicy,
  type PasswordPolicyVM,
  type RegisterFormValues,
  type RegisterSuccessAction,
} from "@/lib/viewmodels/auth/register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import PasswordStrengthHint from "./PasswordStrengthHint";
import TermsAndPrivacyLinks from "./TermsAndPrivacyLinks";
import RateLimitNotice from "./RateLimitNotice";
import { useRegisterMutation } from "@/components/hooks/useRegisterMutation";
import { useRateLimitCooldown } from "@/components/hooks/useRateLimitCooldown";
import { useFocusOnFirstError } from "@/components/hooks/useFocusOnFirstError";

interface RegisterFormErrorMessages {
  emailInvalid: string;
  emailTooLong: string;
  passwordMin: (minLength: number) => string;
  passwordMax: (maxLength: number) => string;
  acceptTerms: string;
  confirmAdult: string;
}

const createRegisterFormSchema = (policy: PasswordPolicyVM, messages: RegisterFormErrorMessages) =>
  z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email({ message: messages.emailInvalid })
      .max(255, { message: messages.emailTooLong }),
    password: z
      .string()
      .min(policy.minLength, { message: messages.passwordMin(policy.minLength) })
      .max(policy.maxLength, { message: messages.passwordMax(policy.maxLength) }),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: messages.acceptTerms,
    }),
    confirmAdult: z.boolean().refine((val) => val === true, {
      message: messages.confirmAdult,
    }),
    skipFtue: z.boolean().default(false),
  });

const registerCopy = {
  labels: {
    email: "Adres email",
    password: "Hasło",
    acceptTerms: "Akceptuję Regulamin i Politykę prywatności",
    confirmAdult: "Potwierdzam, że mam 18 lat lub więcej",
  },
  placeholders: { email: "ty@przyklad.com", password: "Stwórz mocne hasło" },
  buttons: { default: "Utwórz konto", submitting: "Tworzę konto...", wait: "Poczekaj chwilę" },
  alerts: {
    title: "Coś poszło nie tak",
    fieldSummaryTitle: "Popraw formularz",
    fieldSummaryDescription: "Sprawdź oznaczone pola i spróbuj ponownie.",
  },
  status: {
    success: (target: string) => `Konto utworzone. Przekierowuję do ${target}...`,
  },
  errors: {
    emailInvalid: "Podaj poprawny adres email",
    emailTooLong: "Email nie może mieć więcej niż 255 znaków",
    passwordMin: (min: number) => `Użyj co najmniej ${min} znaków`,
    passwordMax: (max: number) => `Hasło nie może mieć więcej niż ${max} znaków`,
    acceptTerms: "Musisz zaakceptować warunki, aby kontynuować",
    confirmAdult: "Musisz potwierdzić, że masz 18 lat lub więcej",
  },
};

interface RegisterFormProps {
  onSuccess: (session: AuthSessionDTO) => Promise<void> | void;
  successAction: RegisterSuccessAction;
  defaultEmail?: string;
  defaultSkipFtue?: boolean;
}

export default function RegisterForm({
  onSuccess,
  successAction,
  defaultEmail = "",
  defaultSkipFtue = false,
}: RegisterFormProps) {
  const passwordPolicy = useMemo(() => defaultPasswordPolicy, []);
  const registerFormSchema = useMemo(
    () => createRegisterFormSchema(passwordPolicy, registerCopy.errors),
    [passwordPolicy]
  );

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: defaultEmail,
      password: "",
      acceptTerms: false,
      confirmAdult: false,
      skipFtue: defaultSkipFtue,
    },
  });

  const { mutate, submitState, errorState, rateLimit } = useRegisterMutation();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useFocusOnFirstError(form);
  const remainingCooldownSeconds = useRateLimitCooldown(rateLimit);

  const handleSubmit = useCallback(
    async (values: RegisterFormValues) => {
      setHasSubmitted(true);
      const result = await mutate(values);
      if (result?.data) {
        await onSuccess(result.data);
        return;
      }
    },
    [mutate, onSuccess]
  );

  const acceptTerms = form.watch("acceptTerms");
  const confirmAdult = form.watch("confirmAdult");
  const isSubmitDisabled = !acceptTerms || !confirmAdult || submitState === "submitting" || rateLimit.isLimited;

  const globalMessage = errorState?.globalMessage;
  const fieldErrors = form.formState.errors;
  const hasAttemptedSubmit = hasSubmitted || form.formState.isSubmitted;
  const shouldShowFieldSummary = hasAttemptedSubmit && Object.keys(fieldErrors).length > 0 && !globalMessage;

  return (
    <Form {...form}>
      <form
        className="space-y-6"
        data-testid="register-form"
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
                <FormLabel>{registerCopy.labels.email}</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="email"
                    inputMode="email"
                    placeholder={registerCopy.placeholders.email}
                    {...field}
                  />
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
                <FormLabel>{registerCopy.labels.password}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder={registerCopy.placeholders.password}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  <PasswordStrengthHint policy={passwordPolicy} currentPassword={field.value} />
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 rounded-lg border border-border/60 p-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    aria-describedby="terms-helper"
                  />
                </FormControl>
                <div className="space-y-1 text-sm leading-tight">
                  <FormLabel className="font-medium">{registerCopy.labels.acceptTerms}</FormLabel>
                  <FormDescription id="terms-helper" className="text-muted-foreground">
                    <TermsAndPrivacyLinks />
                  </FormDescription>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmAdult"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 rounded-lg border border-border/60 p-3">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                </FormControl>
                <div className="space-y-1 text-sm leading-tight">
                  <FormLabel className="font-medium">{registerCopy.labels.confirmAdult}</FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div aria-live="polite" aria-atomic="true" className="space-y-3">
          {globalMessage && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
              <AlertTitle>{registerCopy.alerts.title}</AlertTitle>
              <AlertDescription>{globalMessage}</AlertDescription>
            </Alert>
          )}

          {shouldShowFieldSummary && (
            <Alert className="border-amber-500/60 bg-amber-50 text-amber-900 dark:border-amber-300/40 dark:bg-amber-950/30 dark:text-amber-50">
              <AlertTitle>{registerCopy.alerts.fieldSummaryTitle}</AlertTitle>
              <AlertDescription>{registerCopy.alerts.fieldSummaryDescription}</AlertDescription>
            </Alert>
          )}

          {rateLimit.isLimited && <RateLimitNotice remainingSeconds={remainingCooldownSeconds} />}
        </div>

        <input type="hidden" value={form.getValues("skipFtue") ? "true" : "false"} name="skipFtue" />

        <Button
          className="w-full"
          disabled={isSubmitDisabled}
          type="submit"
          aria-live="polite"
          aria-busy={submitState === "submitting"}
          data-testid="register-submit"
        >
          {submitState === "submitting"
            ? registerCopy.buttons.submitting
            : rateLimit.isLimited
              ? registerCopy.buttons.wait
              : registerCopy.buttons.default}
        </Button>

        {hasSubmitted && submitState === "success" && (
          <p className="text-center text-sm text-muted-foreground" role="status">
            {registerCopy.status.success(successAction.redirectTo)}
          </p>
        )}
      </form>
    </Form>
  );
}
