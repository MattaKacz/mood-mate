import { useEffect, useState } from "react";
import type { RateLimitState } from "@/lib/viewmodels/auth/register";

export function useRateLimitCooldown(rateLimit: RateLimitState): number | undefined {
  const [secondsLeft, setSecondsLeft] = useState<number | undefined>(rateLimit.remainingSeconds);

  useEffect(() => {
    if (!rateLimit.isLimited || !rateLimit.resetAt) {
      setSecondsLeft(undefined);
      return;
    }

    const updateCountdown = () => {
      const target = Date.parse(rateLimit.resetAt ?? "");
      if (Number.isNaN(target)) {
        setSecondsLeft(undefined);
        return;
      }

      const diff = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setSecondsLeft(diff);
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [rateLimit.isLimited, rateLimit.resetAt]);

  return secondsLeft;
}
