import { useCallback, useState } from "react";
import type { AuthSessionDTO, LoginCommand } from "@/types";
import type { LoginFormErrorState, LoginSubmitState, RateLimitState } from "@/lib/viewmodels/auth/register";
import { login } from "@/lib/services/auth/login.client";

interface MutationResult {
  data?: AuthSessionDTO;
  error?: LoginFormErrorState;
}

export function useLoginMutation() {
  const [submitState, setSubmitState] = useState<LoginSubmitState>("idle");
  const [errorState, setErrorState] = useState<LoginFormErrorState | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState>({ isLimited: false });

  const mutate = useCallback(async (command: LoginCommand): Promise<MutationResult> => {
    setSubmitState("submitting");
    setErrorState(null);

    const result = await login(command);

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
