import type { APIRoute } from "astro";

import { AppError, createErrorResponse, generateRequestId, logError } from "@/lib/utils/error-handler";
import type { MoodEntryDetailDTO } from "@/types";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const requestId = generateRequestId();

  try {
    const supabase = locals.supabase;

    if (!supabase) {
      throw new AppError("INTERNAL_ERROR", "Serwis tymczasowo niedostępny", 500);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new AppError("AUTH_ERROR", "Brak autoryzacji", 401);
    }

    const entryId = params.id;
    if (!entryId || isNaN(Number(entryId))) {
      throw new AppError("VALIDATION_ERROR", "Nieprawidłowy identyfikator wpisu", 400);
    }

    // Fetch entry from database
    const { data: entry, error: fetchError } = await supabase
      .from("mood_entries")
      .select("id, score, note, tags, created_at, updated_at, ai_response, ai_helpful")
      .eq("id", Number(entryId))
      .eq("user_id", user.id)
      .single();

    if (fetchError || !entry) {
      if (fetchError?.code === "PGRST116") {
        throw new AppError("NOT_FOUND", "Wpis nie został znaleziony", 404);
      }
      throw new AppError("INTERNAL_ERROR", "Nie udało się pobrać wpisu", 500);
    }

    // Map to DTO
    const entryDetail: MoodEntryDetailDTO = {
      id: entry.id,
      score: entry.score,
      note: entry.note,
      tags: entry.tags ?? [],
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
      aiHelpful: entry.ai_helpful ?? undefined,
      aiSuggestion: entry.ai_response
        ? {
            status: "completed",
            text: entry.ai_response,
          }
        : undefined,
    };

    return new Response(JSON.stringify(entryDetail), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return createErrorResponse(error, requestId);
    }

    logError("GET /api/mood-entries/:id", error, { requestId, entryId: params.id });
    return createErrorResponse(
      new AppError("INTERNAL_ERROR", "Wystąpił nieoczekiwany błąd podczas pobierania wpisu", 500),
      requestId
    );
  }
};
