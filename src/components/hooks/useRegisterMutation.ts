import { useCallback, useState } from "react";
import type { AuthSessionDTO, RegisterCommand } from "@/types";
import type { RateLimitState, RegisterFormErrorState, RegisterSubmitState } from "@/lib/viewmodels/auth/register";
import { register } from "@/lib/services/auth/register.client";

interface MutationResult {
  data?: AuthSessionDTO;
  error?: RegisterFormErrorState;
}

export function useRegisterMutation() {
  const [submitState, setSubmitState] = useState<RegisterSubmitState>("idle");
  const [errorState, setErrorState] = useState<RegisterFormErrorState | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState>({ isLimited: false });

  const mutate = useCallback(async (command: RegisterCommand): Promise<MutationResult> => {
    setSubmitState("submitting");
    setErrorState(null);

    const result = await register(command);

    if (result.success) {
      setRateLimit(result.rateLimit ?? { isLimited: false });
      setSubmitState("success");
      return { data: result.data };
    }

    setRateLimit(result.rateLimit ?? { isLimited: false });
    setErrorState(result.error);
    setSubmitState(result.status === 429 ? "rate_limited" : "error");

    return { error: result.error };
  }, []);

  const reset = useCallback(() => {
    setSubmitState("idle");
    setErrorState(null);
    setRateLimit({ isLimited: false });
  }, []);

  return {
    mutate,
    submitState,
    errorState,
    rateLimit,
    reset,
  };
}
