import type { MessageDTO } from "../../types";

/**
 * Typy błędów aplikacyjnych.
 */
export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "RATE_LIMIT_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "INTERNAL_ERROR";

/**
 * Klasa błędu aplikacyjnego.
 */
export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly httpStatus: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Tworzy odpowiedź HTTP z błędem.
 */
export function createErrorResponse(error: AppError | Error, requestId?: string): Response {
  const isAppError = error instanceof AppError;

  const status = isAppError ? error.httpStatus : 500;
  const message = isAppError ? error.message : "Wystąpił nieoczekiwany błąd";

  const body: MessageDTO = { message };

  // W development można dodać więcej szczegółów
  if (import.meta.env.DEV && !isAppError) {
    // eslint-disable-next-line no-console
    console.error("[createErrorResponse] Unexpected error:", {
      requestId,
      error,
      stack: error.stack,
    });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(requestId && { "X-Request-Id": requestId }),
    },
  });
}

/**
 * Loguje błąd z kontekstem.
 */
export function logError(context: string, error: Error | unknown, metadata?: Record<string, unknown>): void {
  if (error instanceof Error) {
    // eslint-disable-next-line no-console
    console.error(`[${context}] Error:`, {
      message: error.message,
      name: error.name,
      stack: error.stack,
      ...metadata,
    });
  } else {
    // eslint-disable-next-line no-console
    console.error(`[${context}] Unknown error:`, {
      error,
      ...metadata,
    });
  }
}

/**
 * Generuje unikalny ID żądania.
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
