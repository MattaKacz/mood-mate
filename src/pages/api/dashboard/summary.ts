import type { APIRoute } from "astro";
import { getDashboardSummary } from "@/lib/services/dashboard/summary.server";
import type { MessageDTO } from "@/types";
import { generateRequestId, logError } from "@/lib/utils/error-handler";

export const prerender = false;

export const GET: APIRoute = async ({ locals, request }) => {
  const requestId = generateRequestId();

  try {
    if (!locals.supabase) {
      return new Response(
        JSON.stringify({
          message: "Serwis tymczasowo niedostępny",
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

    const {
      data: { user },
      error: userError,
    } = await locals.supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          message: "Brak autoryzacji",
        } satisfies MessageDTO),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": requestId,
          },
        }
      );
    }

    const currentUrl = new URL(request.url);
    const timezone = currentUrl.searchParams.get("tz");

    const summary = await getDashboardSummary(locals.supabase, user.id, { timezone });

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    logError("GET /api/dashboard/summary", error, { requestId });
    return new Response(
      JSON.stringify({
        message: "Nie udało się pobrać dashboardu. Spróbuj ponownie później.",
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
