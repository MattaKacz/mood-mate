import type { APIRoute } from "astro";
import { loginSchema } from "../../../lib/validation/auth/login.schema";
import { loginUser } from "../../../lib/services/auth/login.service";
import type { AuthSessionDTO, MessageDTO } from "../../../types";
import { checkRateLimit, createRateLimitKey, getClientIp } from "../../../lib/utils/rate-limiter";
import { generateRequestId, logError } from "../../../lib/utils/error-handler";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

export const prerender = false;

const DEFAULT_REDIRECT = "/app/dashboard";
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 300;

export const POST: APIRoute = async ({ request, cookies }) => {
  const requestId = generateRequestId();

  try {
    const clientIp = getClientIp(request);
    const rateLimitKey = createRateLimitKey("login", clientIp);
    const rateLimit = checkRateLimit(rateLimitKey, {
      maxRequests: RATE_LIMIT_MAX,
      windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
    });

    if (!rateLimit.allowed) {
      const resetDate = new Date(rateLimit.resetAt);
      logError("POST /api/auth/login", new Error("Rate limit exceeded"), {
        requestId,
        clientIp,
      });

      return new Response(
        JSON.stringify({
          message: "Zbyt wiele prób logowania. Spróbuj ponownie później",
        } satisfies MessageDTO),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": requestId,
            "X-RateLimit-Limit": RATE_LIMIT_MAX.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetDate.toISOString(),
          },
        }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      logError("POST /api/auth/login", error, { requestId, step: "JSON parsing" });
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

    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      logError("POST /api/auth/login", new Error("Validation failed"), {
        requestId,
        errors: validationResult.error.errors,
      });

      return new Response(
        JSON.stringify({
          message: "Błąd walidacji danych logowania",
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

    const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

    const command = validationResult.data;
    const result = await loginUser(supabase, command);

    if (!result.success || !result.data) {
      const error = result.error;
      if (error) {
        logError("POST /api/auth/login", new Error(error.message), {
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

    const responsePayload: { success: true; data: AuthSessionDTO; redirect: string } = {
      success: true,
      data: result.data,
      redirect: DEFAULT_REDIRECT,
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        "X-RateLimit-Limit": RATE_LIMIT_MAX.toString(),
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        "X-RateLimit-Reset": new Date(rateLimit.resetAt).toISOString(),
      },
    });
  } catch (error) {
    logError("POST /api/auth/login", error, { requestId });
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
