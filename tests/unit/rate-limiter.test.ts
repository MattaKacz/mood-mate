import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadRateLimiter = async () => {
  vi.resetModules();
  return await import("@/lib/utils/rate-limiter");
};

describe("rate-limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("pozwala na pierwsze żądanie i zmniejsza remaining", async () => {
    const { checkRateLimit } = await loadRateLimiter();
    const result = checkRateLimit("login:127.0.0.1", { maxRequests: 2, windowSeconds: 60 });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("blokuje po przekroczeniu limitu", async () => {
    const { checkRateLimit } = await loadRateLimiter();

    checkRateLimit("login:127.0.0.1", { maxRequests: 2, windowSeconds: 60 });
    checkRateLimit("login:127.0.0.1", { maxRequests: 2, windowSeconds: 60 });
    const result = checkRateLimit("login:127.0.0.1", { maxRequests: 2, windowSeconds: 60 });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resetuje okno po upływie czasu", async () => {
    const { checkRateLimit } = await loadRateLimiter();

    checkRateLimit("login:127.0.0.1", { maxRequests: 1, windowSeconds: 60 });
    const blocked = checkRateLimit("login:127.0.0.1", { maxRequests: 1, windowSeconds: 60 });
    expect(blocked.allowed).toBe(false);

    vi.setSystemTime(new Date("2025-01-01T00:02:00Z"));
    const reset = checkRateLimit("login:127.0.0.1", { maxRequests: 1, windowSeconds: 60 });

    expect(reset.allowed).toBe(true);
    expect(reset.remaining).toBe(0);
  });

  it("tworzy klucz z opcjonalnym identyfikatorem", async () => {
    const { createRateLimitKey } = await loadRateLimiter();

    expect(createRateLimitKey("login", "1.2.3.4")).toBe("login:1.2.3.4");
    expect(createRateLimitKey("login", "1.2.3.4", "user@example.com")).toBe("login:1.2.3.4:user@example.com");
  });

  it("odczytuje IP z nagłówków proxy", async () => {
    const { getClientIp } = await loadRateLimiter();

    const request = new Request("https://example.com", {
      headers: {
        "x-forwarded-for": "9.9.9.9, 8.8.8.8",
      },
    });

    expect(getClientIp(request)).toBe("9.9.9.9");
  });
});
