import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  calculateStreak,
  calculateTrend,
  evaluateRitualDue,
  getDayKey,
  getDateInTimezone,
} from "@/lib/utils/dashboard";
import type { MoodEntryListItemDTO } from "@/types";
import { MOOD_TAGS } from "@/lib/constants/tag-catalog";

describe("dashboard summary helpers", () => {
  const makeEntry = (overrides: Partial<MoodEntryListItemDTO> = {}): MoodEntryListItemDTO => ({
    id: 1,
    score: 3,
    note: null,
    tags: [MOOD_TAGS[0]],
    createdAt: "2025-01-10T10:00:00Z",
    ...overrides,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-10T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculateTrend zwraca poprawny kierunek", () => {
    // Arrange
    const entries = [
      makeEntry({ id: 1, score: 4, createdAt: "2025-01-10T10:00:00Z" }),
      makeEntry({ id: 2, score: 3, createdAt: "2025-01-09T10:00:00Z" }),
      makeEntry({ id: 3, score: 2, createdAt: "2025-01-08T10:00:00Z" }),
    ];

    // Act
    const result = calculateTrend(entries);

    // Assert
    expect(result.direction).toBe("up");
    expect(result.delta).toBeGreaterThan(0);
  });

  it("calculateTrend zwraca steady dla pojedynczego wpisu", () => {
    // Arrange
    const entries = [makeEntry({ id: 1, score: 3 })];

    // Act
    const result = calculateTrend(entries);

    // Assert
    expect(result).toMatchInlineSnapshot(`
      {
        "delta": 0,
        "direction": "steady",
      }
    `);
  });

  it("calculateTrend zwraca steady, gdy zmiana poniżej progu", () => {
    // Arrange
    const entries = [
      makeEntry({ id: 1, score: 3.2, createdAt: "2025-01-10T10:00:00Z" }),
      makeEntry({ id: 2, score: 3, createdAt: "2025-01-09T10:00:00Z" }),
    ];

    // Act
    const result = calculateTrend(entries);

    // Assert
    expect(result.direction).toBe("steady");
  });

  it("calculateStreak liczy kolejne dni wpisów", () => {
    // Arrange
    const entries = [
      makeEntry({ id: 1, score: 4, createdAt: "2025-01-10T10:00:00Z" }),
      makeEntry({ id: 2, score: 3, createdAt: "2025-01-09T10:00:00Z" }),
      makeEntry({ id: 3, score: 2, createdAt: "2025-01-08T10:00:00Z" }),
    ];

    // Act
    const streak = calculateStreak(entries);

    // Assert
    expect(streak).toBe(3);
  });

  it("calculateStreak zwraca 0 dla pustej listy", () => {
    // Arrange
    const entries: MoodEntryListItemDTO[] = [];

    // Act
    const streak = calculateStreak(entries);

    // Assert
    expect(streak).toBe(0);
  });

  it("calculateStreak zatrzymuje się na pierwszej przerwie", () => {
    // Arrange
    const entries = [
      makeEntry({ id: 1, score: 4, createdAt: "2025-01-10T10:00:00Z" }),
      makeEntry({ id: 2, score: 3, createdAt: "2025-01-08T10:00:00Z" }),
    ];

    // Act
    const streak = calculateStreak(entries);

    // Assert
    expect(streak).toBe(1);
  });

  it("getDayKey uwzględnia strefę czasową", () => {
    // Arrange
    const keyUtc = getDayKey("2025-01-01T23:30:00Z");
    const keyWarsaw = getDayKey("2025-01-01T23:30:00Z", "Europe/Warsaw");

    // Assert
    expect(keyUtc).toBe("2025-01-01");
    expect(keyWarsaw).toBe("2025-01-02");
  });

  it("evaluateRitualDue zwraca brak due dla błędnego czasu", () => {
    // Act
    const result = evaluateRitualDue("xx:yy");

    // Assert
    expect(result.isDue).toBe(false);
    expect(result.label).toBe("xx:yy");
  });

  it("evaluateRitualDue wskazuje due, gdy czas minął", () => {
    // Act
    const result = evaluateRitualDue("11:00");

    // Assert
    expect(result.isDue).toBe(true);
  });

  it("evaluateRitualDue wskazuje brak due, gdy czas jeszcze nie nadszedł", () => {
    // Act
    const result = evaluateRitualDue("13:00");

    // Assert
    expect(result.isDue).toBe(false);
  });

  it("getDateInTimezone zwraca datę w zadanej strefie", () => {
    // Arrange
    const date = new Date("2025-01-01T00:00:00Z");

    // Act
    const converted = getDateInTimezone(date, "Europe/Warsaw");

    // Assert
    expect(converted.toISOString()).not.toBe(date.toISOString());
  });

  it("getDateInTimezone zwraca tę samą datę bez strefy", () => {
    // Arrange
    const date = new Date("2025-01-01T00:00:00Z");

    // Act
    const converted = getDateInTimezone(date);

    // Assert
    expect(converted).toBe(date);
  });
});
