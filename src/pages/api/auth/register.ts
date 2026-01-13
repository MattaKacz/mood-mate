import type { APIRoute } from "astro";
import { registerSchema } from "../../../lib/validation/auth/register.schema";
import { registerUser } from "../../../lib/services/auth/register.service";
import type { MessageDTO } from "../../../types";
import { checkRateLimit, getClientIp, createRateLimitKey } from "../../../lib/utils/rate-limiter";
import { generateRequestId, logError } from "../../../lib/utils/error-handler";
import { persistAuthCookies } from "../../../lib/utils/auth-cookies";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

export const prerender = false;

/**
 * POST /api/auth/register
 *
 * Endpoint rejestracji nowego użytkownika.
 *
 * Przyjmuje:
 * - email: string (znormalizowany do lowercase)
 * - password: string (min. 6 znaków)
 * - acceptTerms: boolean (musi być true)
 * - confirmAdult: boolean (musi być true)
 * - skipFtue: boolean (opcjonalny, domyślnie false)
 *
 * Zwraca:
 * - 201: AuthSessionDTO - pomyślna rejestracja z sesją
 * - 400: MessageDTO - błąd walidacji lub niespełnione warunki
 * - 409: MessageDTO - email już zajęty
 * - 422: MessageDTO - hasło odrzucone
 * - 429: MessageDTO - przekroczony limit zapytań
 * - 500: MessageDTO - błąd serwera
 */
export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const requestId = generateRequestId();

  try {
    // Krok 1: Rate limiting
    const clientIp = getClientIp(request);
    const rateLimitKey = createRateLimitKey("register", clientIp);
    const rateLimit = checkRateLimit(rateLimitKey, {
      maxRequests: 5, // 5 prób rejestracji
      windowSeconds: 300, // w ciągu 5 minut
    });

    if (!rateLimit.allowed) {
      const resetDate = new Date(rateLimit.resetAt);
      logError("POST /api/auth/register", new Error("Rate limit exceeded"), {
        requestId,
        clientIp,
        resetAt: resetDate.toISOString(),
      });

      return new Response(
        JSON.stringify({
          message: `Zbyt wiele prób rejestracji. Spróbuj ponownie po ${resetDate.toLocaleTimeString("pl-PL")}`,
        } satisfies MessageDTO),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetDate.toISOString(),
            "X-Request-Id": requestId,
          },
        }
      );
    }

    // Krok 2: Parsowanie i walidacja danych wejściowych
    let body: unknown;

    try {
      body = await request.json();
    } catch (error) {
      logError("POST /api/auth/register", error, { requestId, step: "JSON parsing" });
      return new Response(
        JSON.stringify({
          message: "Nieprawidłowy format danych JSON",
        } satisfies MessageDTO),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": requestId,
          },
        }
      );
    }

    // Walidacja z użyciem Zod
    const validationResult = registerSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("; ");

      logError("POST /api/auth/register", new Error("Validation failed"), {
        requestId,
        errors: validationResult.error.errors,
      });

      return new Response(
        JSON.stringify({
          message: `Błąd walidacji: ${errors}`,
        } satisfies MessageDTO),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": requestId,
          },
        }
      );
    }

    const command = validationResult.data;

    // Krok 3: Dodatkowy rate limit per email
    const emailRateLimitKey = createRateLimitKey("register", clientIp, command.email);
    const emailRateLimit = checkRateLimit(emailRateLimitKey, {
      maxRequests: 3, // 3 próby dla tego samego emaila
      windowSeconds: 600, // w ciągu 10 minut
    });

    if (!emailRateLimit.allowed) {
      const resetDate = new Date(emailRateLimit.resetAt);
      logError("POST /api/auth/register", new Error("Email rate limit exceeded"), {
        requestId,
        email: command.email,
        resetAt: resetDate.toISOString(),
      });

      return new Response(
        JSON.stringify({
          message: "Zbyt wiele prób rejestracji dla tego adresu email. Spróbuj ponownie później",
        } satisfies MessageDTO),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": requestId,
          },
        }
      );
    }

    // Krok 4: Sprawdzenie dostępności klienta Supabase
    const supabase =
      locals.supabase ??
      createSupabaseServerInstance({
        cookies,
        headers: request.headers,
      });

    locals.supabase = supabase;

    // Krok 5: Wywołanie serwisu rejestracji
    const result = await registerUser(supabase, command);

    // Krok 6: Obsługa wyniku
    if (!result.success) {
      const error = result.error;
      if (!error) {
        return new Response(
          JSON.stringify({
            message: "Wystąpił nieoczekiwany błąd",
          } satisfies MessageDTO),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "X-Request-Id": requestId,
            },
          }
        );
      }

      logError("POST /api/auth/register", new Error(error.message), {
        requestId,
        errorCode: error.code,
        httpStatus: error.httpStatus,
      });

      return new Response(
        JSON.stringify({
          message: error.message,
        } satisfies MessageDTO),
        {
          status: error.httpStatus,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": requestId,
          },
        }
      );
    }

    const successData = result.data;
    if (!successData) {
      return new Response(
        JSON.stringify({
          message: "Wystąpił nieoczekiwany błąd",
        } satisfies MessageDTO),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": requestId,
          },
        }
      );
    }

    // eslint-disable-next-line no-console
    console.info("[POST /api/auth/register] Registration successful:", {
      requestId,
      userId: successData.user.id,
    });

    persistAuthCookies({ cookies, session: successData.session });

    // Krok 7: Zwrócenie sukcesu z kodem 201
    return new Response(JSON.stringify(successData), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        "X-RateLimit-Limit": "5",
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        // TODO: Rozważyć dodanie Set-Cookie dla sesji po stronie klienta
      },
    });
  } catch (error) {
    logError("POST /api/auth/register", error, { requestId });

    return new Response(
      JSON.stringify({
        message: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później",
      } satisfies MessageDTO),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        },
      }
    );
  }
};
