import { useState } from "react";
import type { CreateMoodEntryCommand, MoodEntryCreationResponseDTO } from "@/types";

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface UseAddMoodMutationResult {
  mutate: (data: CreateMoodEntryCommand) => Promise<MoodEntryCreationResponseDTO>;
  isLoading: boolean;
  error: ApiError | null;
  reset: () => void;
}

export function useAddMoodMutation(): UseAddMoodMutationResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutate = async (data: CreateMoodEntryCommand): Promise<MoodEntryCreationResponseDTO> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/mood-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "same-origin",
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as ApiError;

        // Handle 401 - redirect to login
        if (response.status === 401) {
          window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`;
          throw {
            code: "AUTH_ERROR",
            message: "Sesja wygasła. Przekierowuję do logowania...",
            details: errorData.details,
          };
        }

        throw {
          code: errorData.code || "UNKNOWN_ERROR",
          message: errorData.message || "Nie udało się zapisać wpisu",
          details: errorData.details,
        };
      }

      const result = (await response.json()) as MoodEntryCreationResponseDTO;
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setIsLoading(false);
  };

  return {
    mutate,
    isLoading,
    error,
    reset,
  };
}
