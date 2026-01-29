import { AuthError } from "@supabase/supabase-js";

/**
 * Struktura zmapowanego błędu.
 */
export interface MappedError {
  httpStatus: number;
  message: string;
  code: string;
}

/**
 * Mapa kodów błędów Supabase Auth na odpowiedzi HTTP.
 */
const AUTH_ERROR_MAP: Record<string, { status: number; message: string }> = {
  user_already_exists: {
    status: 409,
    message: "Konto z tym adresem email już istnieje",
  },
  weak_password: {
    status: 422,
    message: "Hasło jest zbyt słabe. Użyj silniejszego hasła",
  },
  over_request_rate_limit: {
    status: 429,
    message: "Zbyt wiele prób. Spróbuj ponownie później",
  },
  email_not_confirmed: {
    status: 400,
    message: "Email wymaga potwierdzenia",
  },
  invalid_credentials: {
    status: 401,
    message: "Nieprawidłowy email lub hasło",
  },
  user_not_found: {
    status: 404,
    message: "Użytkownik nie został znaleziony",
  },
  email_exists: {
    status: 409,
    message: "Konto z tym adresem email już istnieje",
  },
  validation_failed: {
    status: 400,
    message: "Nieprawidłowe dane wejściowe",
  },
  session_not_found: {
    status: 401,
    message: "Sesja wygasła lub nie istnieje",
  },
  refresh_token_not_found: {
    status: 401,
    message: "Token odświeżania jest nieprawidłowy",
  },
};

/**
 * Mapuje błąd Supabase Auth na strukturę z kodem HTTP i komunikatem.
 *
 * @param error - Błąd z Supabase
 * @returns Zmapowany błąd z odpowiednim statusem HTTP
 */
export function mapSupabaseAuthError(error: AuthError | Error): MappedError {
  // Sprawdź, czy to błąd Supabase Auth
  if ("code" in error && error.code) {
    const mapped = AUTH_ERROR_MAP[error.code];

    if (mapped) {
      return {
        httpStatus: mapped.status,
        message: mapped.message,
        code: error.code,
      };
    }
  }

  // Sprawdź status HTTP jeśli dostępny
  if ("status" in error && typeof error.status === "number") {
    return {
      httpStatus: error.status,
      message: error.message || "Wystąpił błąd podczas operacji",
      code: "code" in error && typeof error.code === "string" ? error.code : "UNKNOWN_ERROR",
    };
  }

  // Domyślny błąd serwera
  return {
    httpStatus: 500,
    message: error.message || "Wystąpił nieoczekiwany błąd",
    code: "INTERNAL_ERROR",
  };
}

/**
 * Mapa kodów błędów bazy danych Postgres na odpowiedzi HTTP.
 */
const POSTGRES_ERROR_MAP: Record<string, { status: number; message: string }> = {
  "23505": {
    status: 409,
    message: "Rekord o podanych danych już istnieje",
  },
  "23503": {
    status: 400,
    message: "Operacja narusza integralność danych",
  },
  "23502": {
    status: 400,
    message: "Brakuje wymaganych danych",
  },
  "22001": {
    status: 400,
    message: "Dane są zbyt długie",
  },
  "22P02": {
    status: 400,
    message: "Nieprawidłowy format danych",
  },
};

/**
 * Mapuje błąd bazy danych Postgres na strukturę z kodem HTTP i komunikatem.
 *
 * @param error - Błąd z bazy danych
 * @returns Zmapowany błąd z odpowiednim statusem HTTP
 */
export function mapPostgresError(error: { code?: string; message?: string }): MappedError {
  if (error.code && POSTGRES_ERROR_MAP[error.code]) {
    const mapped = POSTGRES_ERROR_MAP[error.code];
    return {
      httpStatus: mapped.status,
      message: mapped.message,
      code: error.code,
    };
  }

  return {
    httpStatus: 500,
    message: error.message || "Wystąpił błąd bazy danych",
    code: error.code || "DATABASE_ERROR",
  };
}

/**
 * Uniwersalny mapper błędów - próbuje rozpoznać typ błędu i zmapować go odpowiednio.
 *
 * @param error - Dowolny błąd
 * @returns Zmapowany błąd z odpowiednim statusem HTTP
 */
export function mapError(error: unknown): MappedError {
  if (!error) {
    return {
      httpStatus: 500,
      message: "Wystąpił nieznany błąd",
      code: "UNKNOWN_ERROR",
    };
  }

  // Sprawdź, czy to błąd Supabase Auth
  if (error instanceof Error && "status" in error) {
    return mapSupabaseAuthError(error as AuthError);
  }

  // Sprawdź, czy to błąd Postgres
  if (typeof error === "object" && "code" in error && typeof (error as { code?: string }).code === "string") {
    const pgCode = (error as { code: string }).code;
    if (POSTGRES_ERROR_MAP[pgCode]) {
      return mapPostgresError(error as { code: string; message?: string });
    }
  }

  // Standardowy błąd JavaScript
  if (error instanceof Error) {
    return {
      httpStatus: 500,
      message: error.message || "Wystąpił nieoczekiwany błąd",
      code: "INTERNAL_ERROR",
    };
  }

  // Nieznany typ błędu
  return {
    httpStatus: 500,
    message: "Wystąpił nieoczekiwany błąd",
    code: "UNKNOWN_ERROR",
  };
}
