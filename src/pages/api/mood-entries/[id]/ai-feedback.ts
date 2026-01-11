import type { APIRoute } from "astro";
import { z } from "zod";

import { AppError, createErrorResponse, generateRequestId, logError } from "@/lib/utils/error-handler";

export const prerender = false;

const feedbackSchema = z.object({
  helpful: z.boolean(),
});

export const POST: APIRoute = async ({ params, request, locals }) => {
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

    // Parse and validate request body
    const body = await request.json();
    const validationResult = feedbackSchema.safeParse(body);

    if (!validationResult.success) {
      throw new AppError("VALIDATION_ERROR", "Nieprawidłowe dane feedbacku", 422);
    }

    const { helpful } = validationResult.data;

    // Update entry with feedback
    const { error: updateError } = await supabase
      .from("mood_entries")
      .update({ ai_helpful: helpful })
      .eq("id", entryId)
      .eq("user_id", user.id);

    if (updateError) {
      logError("POST /api/mood-entries/:id/ai-feedback", updateError, {
        requestId,
        entryId,
        userId: user.id,
      });
      throw new AppError("INTERNAL_ERROR", "Nie udało się zapisać feedbacku", 500);
    }

    return new Response(
      JSON.stringify({
        entryId: Number(entryId),
        aiHelpful: helpful,
        recordedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        },
      }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return createErrorResponse(error, requestId);
    }

    logError("POST /api/mood-entries/:id/ai-feedback", error, { requestId, entryId: params.id });
    return createErrorResponse(
      new AppError("INTERNAL_ERROR", "Wystąpił nieoczekiwany błąd podczas zapisywania feedbacku", 500),
      requestId
    );
  }
};
