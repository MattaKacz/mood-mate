import type { AuthSessionDTO, LoginCommand, MessageDTO } from "@/types";
import type { LoginFormErrorState, RateLimitState } from "@/lib/viewmodels/auth/register";

interface LoginClientSuccess {
  success: true;
  data: AuthSessionDTO;
  redirect?: string;
  rateLimit?: RateLimitState;
}

interface LoginClientError {
  success: false;
  error: LoginFormErrorState;
  rateLimit?: RateLimitState;
  status: number;
}

type LoginClientResponse = LoginClientSuccess | LoginClientError;

export async function login(command: LoginCommand): Promise<LoginClientResponse> {
  try {
    const response = await fetch("/api/auth/login", {
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
      const successPayload = normalizeSuccessPayload(payload);
      return {
        success: true,
        data: successPayload.data,
        redirect: successPayload.redirect,
        rateLimit,
      };
    }

    const backendMessage = extractMessage(payload);
    const errorState: LoginFormErrorState = {
      globalMessage: deriveGlobalMessage(response.status, backendMessage),
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
    const fallbackError: LoginFormErrorState = {
      globalMessage: "Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.",
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

interface LoginSuccessPayload {
  success: true;
  data: AuthSessionDTO;
  redirect?: string;
}
type LoginPayload = LoginSuccessPayload | AuthSessionDTO | MessageDTO | null;

async function parseJson(response: Response): Promise<LoginPayload> {
  try {
    return (await response.json()) as LoginPayload;
  } catch {
    return null;
  }
}

function extractMessage(payload: LoginPayload): string | undefined {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return undefined;
  }

  return typeof payload.message === "string" ? payload.message : undefined;
}

function normalizeSuccessPayload(payload: LoginPayload): LoginSuccessPayload {
  if (payload && typeof payload === "object" && "success" in payload && payload.success === true && "data" in payload) {
    return {
      success: true,
      data: payload.data as AuthSessionDTO,
      redirect: "redirect" in payload && typeof payload.redirect === "string" ? payload.redirect : undefined,
    };
  }

  return {
    success: true,
    data: (payload as AuthSessionDTO) ?? ({} as AuthSessionDTO),
    redirect: undefined,
  };
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

function deriveGlobalMessage(status: number, backendMessage?: string): string {
  if (backendMessage) {
    return backendMessage;
  }

  switch (status) {
    case 400:
      return "Sprawdź formularz i spróbuj ponownie.";
    case 401:
      return "Nieprawidłowy email lub hasło.";
    case 404:
      return "Nie znaleziono użytkownika o podanym adresie email.";
    case 409:
      return "Konto z tym adresem email już istnieje.";
    case 422:
      return "Nie spełniono wymagań bezpieczeństwa hasła.";
    case 429:
      return "Za dużo prób. Odczekaj chwilę i spróbuj ponownie.";
    case 500:
    default:
      return "Coś poszło nie tak po naszej stronie. Spróbuj ponownie za moment.";
  }
}

function mapFieldErrors(status: number, backendMessage?: string): LoginFormErrorState["fieldErrors"] | undefined {
  if (!backendMessage && status !== 401 && status !== 400) {
    return undefined;
  }

  const normalized = backendMessage?.toLowerCase() ?? "";
  const fieldErrors: LoginFormErrorState["fieldErrors"] = {};

  if (status === 401 || normalized.includes("email")) {
    fieldErrors.email = "Sprawdź poprawność adresu email.";
  }

  if (status === 401 || normalized.includes("hasło") || normalized.includes("password")) {
    fieldErrors.password = "Podane hasło jest nieprawidłowe.";
  }

  if (Object.keys(fieldErrors).length === 0) {
    return undefined;
  }

  return fieldErrors;
}
