import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMoodEntry } from "@/lib/services/mood/create-entry.server";
import { MAX_TAGS_PER_ENTRY, MOOD_TAGS } from "@/lib/constants/tag-catalog";
import type { SupabaseClient } from "@/db/supabase.client";

vi.mock("@/lib/utils/supabase-error-mapper", () => ({
  mapPostgresError: vi.fn(),
}));

import { mapPostgresError } from "@/lib/utils/supabase-error-mapper";

const buildSupabaseClient = (result: { data: unknown; error: unknown }) => {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ insert });

  const client = {
    from,
  } as unknown as SupabaseClient;

  return { client, mocks: { single, select, insert, from } };
};

describe("createMoodEntry", () => {
  const mapPostgresErrorMock = mapPostgresError as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mapPostgresErrorMock.mockReset();
  });

  it("rzuca AppError, gdy brak userId", async () => {
    await expect(
      createMoodEntry({} as SupabaseClient, "", { score: 3, note: "ok", tags: [], requestSuggestion: false })
    ).rejects.toMatchObject({
      code: "AUTH_ERROR",
      httpStatus: 401,
    });
  });

  it("trimuje notatkę i ogranicza liczbę tagów", async () => {
    const row = {
      id: 10,
      score: 4,
      note: "ok",
      tags: null,
      created_at: "2025-01-01T10:00:00Z",
      updated_at: "2025-01-01T10:00:00Z",
      ai_response: null,
      ai_helpful: null,
    };
    const { client, mocks } = buildSupabaseClient({ data: row, error: null });

    const tags = MOOD_TAGS.slice(0, MAX_TAGS_PER_ENTRY + 1) as (typeof MOOD_TAGS)[number][];
    const payload = {
      score: 4,
      note: "  hello  ",
      tags,
      requestSuggestion: false,
    };

    const result = await createMoodEntry(client, "user-1", payload);

    expect(result.entry.tags).toEqual([]);
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        note: "hello",
        tags: payload.tags.slice(0, MAX_TAGS_PER_ENTRY),
      })
    );
  });

  it("ustawia null, gdy notatka po trimie jest pusta", async () => {
    const row = {
      id: 11,
      score: 2,
      note: null,
      tags: [],
      created_at: "2025-01-01T10:00:00Z",
      updated_at: "2025-01-01T10:00:00Z",
      ai_response: null,
      ai_helpful: null,
    };
    const { client, mocks } = buildSupabaseClient({ data: row, error: null });

    await createMoodEntry(client, "user-1", {
      score: 2,
      note: "   ",
      tags: [],
      requestSuggestion: false,
    });

    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        note: null,
      })
    );
  });

  it("mapuje błąd Postgresa na AppError typu VALIDATION_ERROR", async () => {
    mapPostgresErrorMock.mockReturnValue({
      httpStatus: 409,
      message: "Duplicate",
      code: "23505",
    });

    const { client } = buildSupabaseClient({ data: null, error: { code: "23505" } });

    await expect(
      createMoodEntry(client, "user-1", { score: 3, note: "ok", tags: [], requestSuggestion: false })
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      httpStatus: 409,
      message: "Duplicate",
      details: { postgresCode: "23505" },
    });
  });

  it("rzuca INTERNAL_ERROR, gdy brak danych w odpowiedzi", async () => {
    const { client } = buildSupabaseClient({ data: null, error: null });

    await expect(
      createMoodEntry(client, "user-1", { score: 3, note: "ok", tags: [], requestSuggestion: false })
    ).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      httpStatus: 500,
      message: "Nie udało się zapisać nastroju",
    });
  });
});
