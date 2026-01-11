import type { APIRoute } from "astro";
import { clearAuthCookies } from "../../../lib/utils/auth-cookies";
import type { MessageDTO } from "../../../types";
import { generateRequestId, logError } from "../../../lib/utils/error-handler";

export const prerender = false;

export const POST: APIRoute = async ({ locals, cookies }) => {
  const requestId = generateRequestId();

  try {
    if (locals.supabase) {
      await locals.supabase.auth.signOut();
    }

    clearAuthCookies(cookies);

    return new Response(
      JSON.stringify({
        message: "Wylogowano pomyślnie",
      } satisfies MessageDTO),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        },
      }
    );
  } catch (error) {
    logError("POST /api/auth/logout", error, { requestId });

    return new Response(
      JSON.stringify({
        message: "Nie udało się wylogować. Spróbuj ponownie później",
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
