import type { APIRoute } from "astro";

import type { SupabaseClient } from "@/db/supabase.client";
import type { AiSuggestionDTO, MoodEntryDetailDTO, MoodEntriesListDTO, MoodEntryListItemDTO } from "@/types";
import { createMoodEntry } from "@/lib/services/mood/create-entry.server";
import { persistAiSuggestion, requestMoodSuggestion } from "@/lib/services/mood/ai-suggestion.server";
import { createMoodEntrySchema } from "@/lib/validation/mood/create-entry.schema";
import { AppError, createErrorResponse, generateRequestId, logError } from "@/lib/utils/error-handler";
import { isMoodTag } from "@/lib/constants/tag-catalog";

const DASHBOARD_PATH = "/app/dashboard";
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
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

    // Parse query parameters
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(url.searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10))
    );
    const tags = url.searchParams.getAll("tag").filter(isMoodTag);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const sortParam = url.searchParams.get("sort") || "created_at";
    const orderParam = url.searchParams.get("order") || "desc";

    // Validate sort parameter
    const validSortFields = ["created_at", "score"];
    const sort = validSortFields.includes(sortParam) ? sortParam : "created_at";
    const ascending = orderParam === "asc";

    // Build query
    let query = supabase
      .from("mood_entries")
      .select("id, score, note, tags, created_at, ai_response", { count: "exact" })
      .eq("user_id", user.id);

    // Apply filters
    if (tags.length > 0) {
      query = query.contains("tags", tags);
    }

    if (from) {
      // Parse date to ISO string if needed
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        query = query.gte("created_at", fromDate.toISOString());
      }
    }

    if (to) {
      // Parse date to ISO string and set to end of day
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        query = query.lte("created_at", toDate.toISOString());
      }
    }

    // Apply sorting - always sort by created_at desc by default
    query = query.order(sort, { ascending });

    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    // Execute query
    const { data: entries, error: fetchError, count } = await query;

    if (fetchError) {
      logError("GET /api/mood-entries", fetchError, { requestId, userId: user.id });
      throw new AppError("INTERNAL_ERROR", "Nie udało się pobrać wpisów", 500);
    }

    // Map to DTO
    const listItems: MoodEntryListItemDTO[] = (entries || []).map((entry) => ({
      id: entry.id,
      score: entry.score,
      note: entry.note,
      tags: entry.tags ?? [],
      createdAt: entry.created_at,
      aiSuggestion: entry.ai_response
        ? {
            status: "completed",
            text: entry.ai_response,
          }
        : undefined,
    }));

    const response: MoodEntriesListDTO = {
      entries: listItems,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        hasNext: (count || 0) > offset + pageSize,
      },
    };

    return new Response(JSON.stringify(response), {
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

    logError("GET /api/mood-entries", error, { requestId });
    return createErrorResponse(
      new AppError("INTERNAL_ERROR", "Wystąpił nieoczekiwany błąd podczas pobierania wpisów", 500),
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
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

    const rawPayload = await parseRequestPayload(request);
    const parsedResult = createMoodEntrySchema.safeParse(rawPayload);

    if (!parsedResult.success) {
      const message = parsedResult.error.issues[0]?.message ?? "Niepoprawne dane wpisu";
      throw new AppError("VALIDATION_ERROR", message, 422, {
        issues: parsedResult.error.issues,
      });
    }

    const { entry } = await createMoodEntry(supabase, user.id, parsedResult.data);

    const acceptLanguage = request.headers.get("accept-language") ?? undefined;

    let aiSuggestion: AiSuggestionDTO | undefined;
    let entryWithSuggestion: MoodEntryDetailDTO = entry;

    if (parsedResult.data.requestSuggestion) {
      aiSuggestion = await generateSuggestionWithFallback({
        entry,
        locale: acceptLanguage,
        supabase,
        userId: user.id,
        requestId,
      });
    } else {
      aiSuggestion = { status: "skipped" };
    }

    entryWithSuggestion = {
      ...entry,
      aiSuggestion,
    };

    if (isFormSubmission(request)) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: getRedirectTarget(request),
          "X-Request-Id": requestId,
        },
      });
    }

    return new Response(
      JSON.stringify({
        entry: entryWithSuggestion,
        aiSuggestion,
      }),
      {
        status: 201,
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

    logError("POST /api/mood-entries", error, { requestId });
    return createErrorResponse(
      new AppError("INTERNAL_ERROR", "Wystąpił nieoczekiwany błąd podczas zapisu nastroju", 500),
      requestId
    );
  }
};

type RequestPayload = Record<string, unknown>;

async function parseRequestPayload(request: Request): Promise<RequestPayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as RequestPayload;
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return {
      score: formData.get("score"),
      note: getStringValue(formData.get("note")),
      tags: collectTagValues(formData),
      requestSuggestion: normalizeBoolean(formData.get("requestSuggestion")),
    };
  }

  if (!contentType) {
    return (await request.json().catch(() => ({}))) as RequestPayload;
  }

  throw new AppError("VALIDATION_ERROR", "Nieobsługiwany typ żądania", 415);
}

function isFormSubmission(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
}

function getRedirectTarget(request: Request): string {
  const url = new URL(request.url);
  const requested = url.searchParams.get("redirectTo");

  if (!requested) {
    return `${DASHBOARD_PATH}?entrySaved=1`;
  }

  if (!requested.startsWith("/") || requested.startsWith("//")) {
    return `${DASHBOARD_PATH}?entrySaved=1`;
  }

  return requested;
}

function collectTagValues(formData: FormData): string[] {
  const values = [...formData.getAll("tags"), ...formData.getAll("tags[]"), ...splitCsv(formData.get("tagsCsv"))];

  return values
    .map(getStringValue)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function splitCsv(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") {
    return [];
  }
  return value.split(",").map((part) => part.trim());
}

function getStringValue(value: FormDataEntryValue | null): string {
  if (typeof value === "string") {
    return value;
  }
  return "";
}

function normalizeBoolean(value: FormDataEntryValue | null): boolean | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }
  return undefined;
}

interface SuggestionFallbackParams {
  entry: MoodEntryDetailDTO;
  userId: string;
  locale?: string;
  supabase: SupabaseClient;
  requestId: string;
}

async function generateSuggestionWithFallback(params: SuggestionFallbackParams): Promise<AiSuggestionDTO> {
  try {
    const result = await requestMoodSuggestion({
      entry: params.entry,
      locale: params.locale,
      userId: params.userId,
    });

    await persistAiSuggestion(params.supabase, params.entry.id, params.userId, result.content);

    return result.suggestion;
  } catch (error) {
    logError("AI_SUGGESTION", error, {
      requestId: params.requestId,
      entryId: params.entry.id,
    });

    return {
      status: "fallback",
      text: "Tym razem nie udało się przygotować ćwiczenia. Spróbuj ponownie później.",
    };
  }
}
