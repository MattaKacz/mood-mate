/**
 * Prosty rate limiter w pamięci dla ochrony endpointów.
 *
 * UWAGA: To jest implementacja tymczasowa dla development.
 * W produkcji należy użyć Redis lub innego rozwiązania rozproszonego.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Czyszczenie starych wpisów co 5 minut
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

export interface RateLimitConfig {
  /**
   * Maksymalna liczba żądań w oknie czasowym
   */
  maxRequests: number;
  /**
   * Okno czasowe w sekundach
   */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Sprawdza, czy żądanie jest dozwolone w ramach limitu.
 *
 * @param key - Unikalny klucz identyfikujący źródło żądania (np. IP, email)
 * @param config - Konfiguracja limitu
 * @returns Wynik sprawdzenia z informacją o pozostałych żądaniach
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  // Wyłącz rate limiting w środowisku testowym (E2E testy)
  if (import.meta.env.TEST_DISABLE_RATE_LIMITING === "true") {
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: Date.now() + config.windowSeconds * 1000,
    };
  }

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = store.get(key);

  // Jeśli nie ma wpisu lub okno wygasło, utwórz nowy
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Sprawdź, czy przekroczono limit
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Zwiększ licznik
  entry.count++;

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Pobiera IP z żądania, uwzględniając proxy.
 */
export function getClientIp(request: Request): string {
  // Sprawdź nagłówki proxy
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback - w development może być undefined
  return "unknown";
}

/**
 * Tworzy klucz rate limitu na podstawie IP i opcjonalnego identyfikatora.
 */
export function createRateLimitKey(prefix: string, ip: string, identifier?: string): string {
  if (identifier) {
    return `${prefix}:${ip}:${identifier}`;
  }
  return `${prefix}:${ip}`;
}
