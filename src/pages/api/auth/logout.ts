import type { APIRoute } from "astro";
import { clearAuthCookies } from "../../../lib/utils/auth-cookies";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import type { MessageDTO } from "../../../types";
import { generateRequestId, logError } from "../../../lib/utils/error-handler";

export const prerender = false;

export const POST: APIRoute = async ({ locals, cookies, request }) => {
  const requestId = generateRequestId();

  try {
    const supabase =
      locals.supabase ??
      createSupabaseServerInstance({
        cookies,
        headers: request.headers,
      });

    await supabase.auth.signOut();

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
