import type { SupabaseClient } from "../../../db/supabase.client";
import type { AuthSessionDTO, RegisterCommand } from "../../../types";
import { mapSupabaseAuthError } from "../../utils/supabase-error-mapper";

/**
 * Wynik operacji rejestracji użytkownika.
 */
export interface RegisterResult {
  success: boolean;
  data?: AuthSessionDTO;
  error?: {
    code: string;
    message: string;
    httpStatus: number;
  };
}

/**
 * Serwis rejestracji użytkownika.
 *
 * Przepływ:
 * 1. Walidacja zgód (acceptTerms, confirmAdult)
 * 2. Utworzenie konta w Supabase Auth
 * 3. Utworzenie profilu w tabeli users_profile
 * 4. Obsługa skipFtue (jeśli wymagane)
 * 5. Zwrócenie sesji użytkownika
 *
 * @param supabase - Klient Supabase z kontekstu
 * @param command - Dane rejestracji
 * @returns Wynik operacji z danymi sesji lub błędem
 */
export async function registerUser(supabase: SupabaseClient, command: RegisterCommand): Promise<RegisterResult> {
  try {
    // Krok 1: Walidacja biznesowa zgód
    if (!command.acceptTerms) {
      return {
        success: false,
        error: {
          code: "TERMS_NOT_ACCEPTED",
          message: "Musisz zaakceptować regulamin",
          httpStatus: 400,
        },
      };
    }

    if (!command.confirmAdult) {
      return {
        success: false,
        error: {
          code: "ADULT_NOT_CONFIRMED",
          message: "Musisz potwierdzić, że jesteś pełnoletni/a",
          httpStatus: 400,
        },
      };
    }

    // Krok 2: Utworzenie konta w Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: command.email,
      password: command.password,
    });

    if (authError) {
      // eslint-disable-next-line no-console
      console.error("[registerUser] Supabase Auth error:", {
        code: authError.code,
        message: authError.message,
        status: authError.status,
      });

      const mappedError = mapSupabaseAuthError(authError);

      return {
        success: false,
        error: {
          code: mappedError.code,
          message: mappedError.message,
          httpStatus: mappedError.httpStatus,
        },
      };
    }

    if (!authData.user || !authData.session) {
      // eslint-disable-next-line no-console
      console.error("[registerUser] No user or session returned from signUp");
      return {
        success: false,
        error: {
          code: "NO_USER_SESSION",
          message: "Nie udało się utworzyć sesji użytkownika",
          httpStatus: 500,
        },
      };
    }

    // Krok 3: Utworzenie profilu użytkownika w tabeli users_profile
    const { error: profileError } = await supabase.from("users_profile").insert({
      id: authData.user.id,
      // Domyślne wartości zostaną ustawione przez bazę danych
    });

    if (profileError) {
      // eslint-disable-next-line no-console
      console.error("[registerUser] Failed to create user profile:", {
        userId: authData.user.id,
        error: profileError,
      });

      // Próba wycofania - usunięcie użytkownika z Auth
      // Wymaga uprawnień admin, więc może się nie udać
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
        // eslint-disable-next-line no-console
        console.info("[registerUser] Rolled back user creation:", authData.user.id);
      } catch (rollbackError) {
        // eslint-disable-next-line no-console
        console.error("[registerUser] Failed to rollback user creation:", {
          userId: authData.user.id,
          error: rollbackError,
        });
        // Zaloguj do manualnej interwencji
        // eslint-disable-next-line no-console
        console.error("[registerUser] MANUAL INTERVENTION REQUIRED: Orphaned user account:", {
          userId: authData.user.id,
          email: command.email,
        });
      }

      return {
        success: false,
        error: {
          code: "PROFILE_CREATION_FAILED",
          message: "Nie udało się utworzyć profilu użytkownika",
          httpStatus: 500,
        },
      };
    }

    // Krok 4: Obsługa skipFtue
    // TODO: Doprecyzować schemat przechowywania skipFtue
    // Obecnie zakładamy, że domyślny stan FTUE w bazie jest wystarczający
    if (command.skipFtue) {
      // eslint-disable-next-line no-console
      console.info("[registerUser] User requested to skip FTUE:", {
        userId: authData.user.id,
      });
      // Tutaj można dodać logikę zapisania stanu FTUE jako completed
      // np. aktualizacja users_profile.ftue_state
    }

    // Krok 5: Złożenie odpowiedzi AuthSessionDTO
    const expiresAt = authData.session.expires_at
      ? new Date(authData.session.expires_at * 1000).toISOString()
      : new Date(Date.now() + 3600000).toISOString();

    const response: AuthSessionDTO = {
      user: {
        id: authData.user.id,
        email: authData.user.email || command.email,
      },
      session: {
        accessToken: authData.session.access_token,
        expiresAt,
        refreshToken: authData.session.refresh_token || "",
      },
    };

    // eslint-disable-next-line no-console
    console.info("[registerUser] User registered successfully:", {
      userId: authData.user.id,
      email: authData.user.email,
    });

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[registerUser] Unexpected error:", error);

    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Wystąpił nieoczekiwany błąd podczas rejestracji",
        httpStatus: 500,
      },
    };
  }
}
