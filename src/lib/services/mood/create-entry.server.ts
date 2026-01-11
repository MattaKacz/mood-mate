import type { SupabaseClient } from "@/db/supabase.client";
import type { Tables } from "@/db/database.types";
import type { CreateMoodEntryCommand, MoodEntryDetailDTO } from "@/types";
import { MAX_TAGS_PER_ENTRY } from "@/lib/constants/tag-catalog";
import { AppError } from "@/lib/utils/error-handler";
import { mapPostgresError } from "@/lib/utils/supabase-error-mapper";

type MoodEntryRow = Tables<"mood_entries">;

function mapRowToDetailDTO(row: MoodEntryRow): MoodEntryDetailDTO {
  return {
    id: row.id,
    score: row.score,
    note: row.note,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    aiHelpful: row.ai_helpful ?? undefined,
    aiSuggestion: row.ai_response
      ? {
          status: "completed",
          text: row.ai_response,
        }
      : undefined,
  };
}

export async function createMoodEntry(
  supabase: SupabaseClient,
  userId: string,
  payload: CreateMoodEntryCommand
): Promise<{ entry: MoodEntryDetailDTO }> {
  if (!userId) {
    throw new AppError("AUTH_ERROR", "Brak autoryzacji użytkownika", 401);
  }

  const trimmedNote = payload.note?.trim();
  const normalizedTags = (payload.tags ?? []).slice(0, MAX_TAGS_PER_ENTRY);

  const { data, error } = await supabase
    .from("mood_entries")
    .insert({
      user_id: userId,
      score: payload.score,
      note: trimmedNote?.length ? trimmedNote : null,
      tags: normalizedTags,
    })
    .select("id, score, note, tags, created_at, updated_at, ai_response, ai_helpful")
    .single();

  if (error || !data) {
    const mapped = error ? mapPostgresError(error) : undefined;
    throw new AppError(
      mapped && mapped.httpStatus < 500 ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
      mapped?.message ?? "Nie udało się zapisać nastroju",
      mapped?.httpStatus ?? 500,
      mapped?.code ? { postgresCode: mapped.code } : undefined
    );
  }

  return {
    entry: mapRowToDetailDTO(data),
  };
}
