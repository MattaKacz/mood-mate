import type { AuthSessionDTO, LoginCommand, RegisterCommand } from "@/types";

export type RegisterFormValues = Pick<
  RegisterCommand,
  "email" | "password" | "acceptTerms" | "confirmAdult" | "skipFtue"
>;

export type LoginFormValues = LoginCommand;

export type AuthFormSubmitState = "idle" | "submitting" | "success" | "error" | "rate_limited";
export type RegisterSubmitState = AuthFormSubmitState;
export type LoginSubmitState = AuthFormSubmitState;

export interface RateLimitState {
  isLimited: boolean;
  resetAt?: string;
  /**
   * Client-side countdown derived from resetAt header.
   */
  remainingSeconds?: number;
}

export interface AuthFormErrorState<TFields extends string> {
  globalMessage?: string;
  fieldErrors?: Partial<Record<TFields, string>>;
  requestId?: string;
  httpStatus?: number;
}

export type RegisterFormErrorState = AuthFormErrorState<keyof RegisterFormValues>;
export type LoginFormErrorState = AuthFormErrorState<keyof LoginFormValues>;

export interface PasswordPolicyVM {
  minLength: number;
  maxLength: number;
  recommendations: string[];
}

export interface RegisterSuccessAction {
  redirectTo: string;
  persistSession: "supabase_set_session" | "server_cookie" | "none";
  session?: AuthSessionDTO;
}

export const defaultPasswordPolicy: PasswordPolicyVM = {
  minLength: 8,
  maxLength: 128,
  recommendations: ["Użyj co najmniej 8 znaków", "Dodaj cyfrę", "Dodaj symbol"],
};
