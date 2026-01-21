import { describe, expect, it } from "vitest";

import { MAX_TAGS_PER_ENTRY, MOOD_TAGS } from "@/lib/constants/tag-catalog";
import { createMoodEntrySchema } from "@/lib/validation/mood/create-entry.schema";

describe("createMoodEntrySchema", () => {
  it("coerces score, trims note i ustawia domyślne wartości", () => {
    const result = createMoodEntrySchema.parse({
      score: "4",
      note: "  test  ",
    });

    expect(result.score).toBe(4);
    expect(result.note).toBe("test");
    expect(result.tags).toEqual([]);
    expect(result.requestSuggestion).toBe(false);
  });

  it("odrzuca zbyt wysoką ocenę nastroju", () => {
    const result = createMoodEntrySchema.safeParse({
      score: 6,
      note: "ok",
    });

    expect(result.success).toBe(false);
  });

  it("odrzuca zbyt długą notatkę", () => {
    const result = createMoodEntrySchema.safeParse({
      score: 3,
      note: "x".repeat(281),
    });

    expect(result.success).toBe(false);
  });

  it("odrzuca przekroczoną liczbę tagów", () => {
    const tags = MOOD_TAGS.slice(0, MAX_TAGS_PER_ENTRY + 1);
    const result = createMoodEntrySchema.safeParse({
      score: 2,
      tags,
    });

    expect(result.success).toBe(false);
  });
});
