import type { PasswordPolicyVM } from "@/lib/viewmodels/auth/register";

interface PasswordStrengthHintProps {
  policy: PasswordPolicyVM;
  currentPassword?: string;
}

export default function PasswordStrengthHint({ policy, currentPassword }: PasswordStrengthHintProps) {
  const length = currentPassword?.length ?? 0;
  const meetsRequirement = length >= policy.minLength;
  const remaining = Math.max(policy.minLength - length, 0);

  return (
    <div className="text-muted-foreground">
      <p>
        {meetsRequirement
          ? "Wygląda dobrze — trzymaj hasło w tajemnicy."
          : `Użyj co najmniej ${policy.minLength} znaków (jeszcze ${remaining}).`}
      </p>
      <p className="mt-1">Rozważ dodanie:</p>
      <ul className="mt-1 list-disc pl-5 text-muted-foreground/80">
        {policy.recommendations.map((recommendation) => (
          <li key={recommendation}>{recommendation}</li>
        ))}
      </ul>
    </div>
  );
}
