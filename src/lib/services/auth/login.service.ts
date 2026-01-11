import type { SupabaseClient } from "../../../db/supabase.client";
import type { AuthSessionDTO, LoginCommand } from "../../../types";
import { mapSupabaseAuthError } from "../../utils/supabase-error-mapper";

export interface LoginResult {
  success: boolean;
  data?: AuthSessionDTO;
  error?: {
    code: string;
    message: string;
    httpStatus: number;
  };
}

export async function loginUser(supabase: SupabaseClient, command: LoginCommand): Promise<LoginResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: command.email,
      password: command.password,
    });

    if (error) {
      const mappedError = mapSupabaseAuthError(error);
      return {
        success: false,
        error: {
          code: mappedError.code,
          message: mappedError.message,
          httpStatus: mappedError.httpStatus,
        },
      };
    }

    if (!data.user || !data.session) {
      return {
        success: false,
        error: {
          code: "NO_SESSION",
          message: "Nie udało się utworzyć sesji użytkownika",
          httpStatus: 500,
        },
      };
    }

    const expiresAt = data.session.expires_at
      ? new Date(data.session.expires_at * 1000).toISOString()
      : new Date(Date.now() + 3600000).toISOString();

    const response: AuthSessionDTO = {
      user: {
        id: data.user.id,
        email: data.user.email ?? command.email,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token ?? "",
        expiresAt,
      },
    };

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    const mappedError = mapSupabaseAuthError(error as Error);
    return {
      success: false,
      error: {
        code: mappedError.code,
        message: mappedError.message,
        httpStatus: mappedError.httpStatus,
      },
    };
  }
}
