import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { persistAiSuggestion, requestMoodSuggestion } from "@/lib/services/mood/ai-suggestion.server";
import type { MoodEntryDetailDTO } from "@/types";
import type { SupabaseClient } from "@/db/supabase.client";

vi.mock("@/lib/openrouter", () => ({
  getOpenRouterService: vi.fn(),
}));

import { getOpenRouterService } from "@/lib/openrouter";

const buildEntry = (overrides: Partial<MoodEntryDetailDTO> = {}): MoodEntryDetailDTO => ({
  id: 12,
  score: 2,
  note: " Mam gorszy dzień ",
  tags: ["stress", "sleep"],
  createdAt: "2025-01-10T10:00:00Z",
  updatedAt: "2025-01-10T10:00:00Z",
  ...overrides,
});

describe("requestMoodSuggestion", () => {
  const invokeChat = vi.fn();

  beforeEach(() => {
    invokeChat.mockReset();
    (getOpenRouterService as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ invokeChat });
  });

  it("formatuje plan i zwraca completed, gdy JSON przechodzi walidację", async () => {
    const plan = {
      summary: "To jest spokojne podsumowanie sytuacji.",
      affirmation: "Robisz coś ważnego, dbając o siebie.",
      steps: [
        {
          title: "Zatrzymaj się",
          description: "Weź kilka oddechów i sprawdź, co czujesz.",
          duration: "2 min",
        },
        {
          title: "Rozluźnij ciało",
          description: "Rozluźnij ramiona i szyję, poruszając delikatnie.",
          duration: "2 min",
        },
      ],
      grounding: {
        inhale: 4,
        exhale: 6,
        hold: 2,
        tip: "Skup się na powolnym wydechu.",
      },
      reflectionQuestion: "Co mogę zrobić dla siebie w najbliższych 5 minutach?",
    };

    invokeChat.mockResolvedValue({
      id: "chat-1",
      model: "test-model",
      content: JSON.stringify(plan),
      raw: {} as unknown,
    });

    const performanceSpy = vi.spyOn(globalThis.performance, "now");
    performanceSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1123);

    const entry = buildEntry();
    const result = await requestMoodSuggestion({ entry, userId: "user-1", locale: "pl-PL" });

    expect(result.suggestion.status).toBe("completed");
    expect(result.rawPlan).toBeDefined();
    expect(result.content).toContain(plan.summary);
    expect(result.durationMs).toBe(123);

    const [options] = invokeChat.mock.calls[0] ?? [];
    const expectedHash = createHash("sha256")
      .update(entry.note ?? "")
      .digest("hex");
    expect(options.metadata).toMatchObject({
      entry_id: String(entry.id),
      user_id: "user-1",
      mood_score: String(entry.score),
      mood_tags: entry.tags?.join(","),
      source_hash: expectedHash,
    });

    performanceSpy.mockRestore();
  });

  it("zwraca fallback, gdy odpowiedź nie jest poprawnym JSON", async () => {
    invokeChat.mockResolvedValue({
      id: "chat-2",
      model: "test-model",
      content: "not-json",
      raw: {} as unknown,
    });

    const result = await requestMoodSuggestion({ entry: buildEntry(), userId: "user-1" });

    expect(result.suggestion.status).toBe("fallback");
    expect(result.content).toBe("not-json");
  });

  it("zwraca domyślny fallback, gdy brak treści", async () => {
    invokeChat.mockResolvedValue({
      id: "chat-3",
      model: "test-model",
      content: "",
      raw: {} as unknown,
    });

    const result = await requestMoodSuggestion({ entry: buildEntry({ note: null }), userId: "user-1" });

    expect(result.suggestion.status).toBe("fallback");
    expect(result.content).toBe("Spróbuj wykonać krótkie ćwiczenie oddechowe lub opisz swój nastrój ponownie.");
  });
});

describe("persistAiSuggestion", () => {
  it("aktualizuje wpis i nie rzuca błędu", async () => {
    const eqFinal = vi.fn().mockResolvedValue({ error: null });
    const eqFirst = vi.fn().mockReturnValue({ eq: eqFinal });
    const update = vi.fn().mockReturnValue({ eq: eqFirst });
    const from = vi.fn().mockReturnValue({ update });

    const client = { from } as unknown as SupabaseClient;

    await expect(persistAiSuggestion(client, 5, "user-1", "hello")).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith({ ai_response: "hello", ai_helpful: null });
  });

  it("propaguje błąd z supabase update", async () => {
    const eqFinal = vi.fn().mockResolvedValue({ error: new Error("db") });
    const eqFirst = vi.fn().mockReturnValue({ eq: eqFinal });
    const update = vi.fn().mockReturnValue({ eq: eqFirst });
    const from = vi.fn().mockReturnValue({ update });

    const client = { from } as unknown as SupabaseClient;

    await expect(persistAiSuggestion(client, 5, "user-1", "hello")).rejects.toThrow("db");
  });
});
