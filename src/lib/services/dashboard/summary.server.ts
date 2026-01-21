import type { SupabaseClient } from "@/db/supabase.client";
import type { Tables } from "@/db/database.types";
import type { DashboardRitualReminderDTO, DashboardSummaryDTO, MoodEntryListItemDTO } from "@/types";
import { calculateStreak, calculateTrend, evaluateRitualDue } from "@/lib/utils/dashboard";

interface GetDashboardSummaryOptions {
  timezone?: string | null;
}

type MoodEntryRow = Pick<Tables<"mood_entries">, "id" | "score" | "note" | "tags" | "created_at">;
type UserProfileRow = Pick<Tables<"users_profile">, "ritual_time">;

export async function getDashboardSummary(
  supabase: SupabaseClient,
  userId: string,
  options?: GetDashboardSummaryOptions
): Promise<DashboardSummaryDTO> {
  const timezone = options?.timezone ?? undefined;

  const [entries, ritualReminder] = await Promise.all([
    fetchRecentEntries(supabase, userId),
    fetchRitualReminder(supabase, userId, timezone),
  ]);

  const mappedEntries = entries.map(mapEntryRowToDto);
  const { direction, delta } = calculateTrend(mappedEntries);
  const streak = calculateStreak(mappedEntries, timezone);

  return {
    streak,
    trendDirection: direction,
    trendDelta: delta,
    entries: mappedEntries,
    ritualReminder,
  };
}

async function fetchRecentEntries(supabase: SupabaseClient, userId: string): Promise<MoodEntryRow[]> {
  const { data, error } = await supabase
    .from("mood_entries")
    .select("id, score, note, tags, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(7);

  if (error) {
    throw new Error(`Failed to fetch dashboard entries: ${error.message}`);
  }

  return data ?? [];
}

async function fetchRitualReminder(
  supabase: SupabaseClient,
  userId: string,
  timezone?: string
): Promise<DashboardRitualReminderDTO | undefined> {
  const { data, error } = await supabase
    .from("users_profile")
    .select("ritual_time")
    .eq("id", userId)
    .single<UserProfileRow>();

  if (error || !data?.ritual_time) {
    return undefined;
  }

  const { label, isDue } = evaluateRitualDue(data.ritual_time, timezone);

  return {
    time: label,
    isDue,
  };
}

function mapEntryRowToDto(row: MoodEntryRow): MoodEntryListItemDTO {
  return {
    id: row.id,
    score: row.score,
    note: row.note,
    tags: row.tags ?? [],
    createdAt: row.created_at,
  };
}
