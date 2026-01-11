import type { AuthSessionDTO, MessageDTO, RegisterCommand } from "@/types";
import type { RateLimitState, RegisterFormErrorState } from "@/lib/viewmodels/auth/register";

interface RegisterClientSuccess {
  success: true;
  data: AuthSessionDTO;
  rateLimit?: RateLimitState;
}

interface RegisterClientError {
  success: false;
  error: RegisterFormErrorState;
  rateLimit?: RateLimitState;
  status: number;
}

type RegisterClientResponse = RegisterClientSuccess | RegisterClientError;

export async function register(command: RegisterCommand): Promise<RegisterClientResponse> {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    const rateLimit = buildRateLimitState(response);
    const requestId = response.headers.get("X-Request-Id") ?? undefined;
    const payload = await parseJson(response);

    if (response.ok) {
      return {
        success: true,
        data: payload as AuthSessionDTO,
        rateLimit,
      };
    }

    const backendMessage = extractMessage(payload);
    const errorState: RegisterFormErrorState = {
      globalMessage: mapGlobalMessage(response.status),
      fieldErrors: mapFieldErrors(response.status, backendMessage),
      requestId,
      httpStatus: response.status,
    };

    return {
      success: false,
      error: errorState,
      rateLimit,
      status: response.status,
    };
  } catch {
    const fallbackError: RegisterFormErrorState = {
      globalMessage: "Nie udało się połączyć z serwerem. Spróbuj ponownie za chwilę.",
      httpStatus: 0,
    };

    return {
      success: false,
      error: fallbackError,
      rateLimit: { isLimited: false },
      status: 0,
    };
  }
}

async function parseJson(response: Response): Promise<AuthSessionDTO | MessageDTO | null> {
  try {
    return (await response.json()) as AuthSessionDTO | MessageDTO;
  } catch {
    return null;
  }
}

function extractMessage(payload: AuthSessionDTO | MessageDTO | null): string | undefined {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return undefined;
  }

  return typeof payload.message === "string" ? payload.message : undefined;
}

function buildRateLimitState(response: Response): RateLimitState {
  if (response.status !== 429) {
    return { isLimited: false };
  }

  const resetAt = response.headers.get("X-RateLimit-Reset") ?? undefined;
  const resetTimestamp = resetAt ? Date.parse(resetAt) : undefined;
  const remainingSeconds =
    typeof resetTimestamp === "number" && !Number.isNaN(resetTimestamp)
      ? Math.max(0, Math.ceil((resetTimestamp - Date.now()) / 1000))
      : undefined;

  return {
    isLimited: true,
    resetAt,
    remainingSeconds,
  };
}

function mapGlobalMessage(status: number): string {
  switch (status) {
    case 400:
      return "Sprawdź formularz i spróbuj ponownie.";
    case 409:
      return "Nie udało się utworzyć konta. Spróbuj zalogować się istniejącym kontem.";
    case 422:
      return "Hasło jest zbyt słabe. Wybierz bezpieczniejsze.";
    case 429:
      return "Za dużo prób. Odczekaj chwilę i spróbuj ponownie.";
    case 500:
    default:
      return "Coś poszło nie tak po naszej stronie. Spróbuj ponownie za moment.";
  }
}

function mapFieldErrors(status: number, backendMessage?: string): RegisterFormErrorState["fieldErrors"] | undefined {
  if (!backendMessage && status !== 422 && status !== 409) {
    return undefined;
  }

  const normalized = backendMessage?.toLowerCase() ?? "";
  const fieldErrors: RegisterFormErrorState["fieldErrors"] = {};

  if (status === 409 || normalized.includes("email")) {
    fieldErrors.email = "Ten adres email jest już zarejestrowany. Spróbuj się zalogować.";
  }

  if (status === 422 || normalized.includes("hasło") || normalized.includes("password")) {
    fieldErrors.password = "Wybierz mocniejsze hasło, aby chronić konto.";
  }

  if (normalized.includes("regulamin") || normalized.includes("terms")) {
    fieldErrors.acceptTerms = "Zaakceptuj warunki, aby kontynuować.";
  }

  if (normalized.includes("pełnoletni") || normalized.includes("adult")) {
    fieldErrors.confirmAdult = "Potwierdź pełnoletność, aby utworzyć konto.";
  }

  if (Object.keys(fieldErrors).length === 0) {
    return undefined;
  }

  return fieldErrors;
}
