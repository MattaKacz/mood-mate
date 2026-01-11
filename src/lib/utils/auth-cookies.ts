import type { APIContext } from "astro";
import type { AuthSessionDTO } from "@/types";

interface PersistSessionOptions {
  cookies: APIContext["cookies"];
  session: AuthSessionDTO["session"];
}

const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dni

export function persistAuthCookies({ cookies, session }: PersistSessionOptions) {
  const isProduction = import.meta.env.PROD;
  const baseCookieOptions = {
    httpOnly: true as const,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
  };

  const accessTokenTtlSeconds = Math.max(60, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));

  cookies.set("mm_access_token", session.accessToken, {
    ...baseCookieOptions,
    maxAge: accessTokenTtlSeconds,
  });

  if (session.refreshToken) {
    cookies.set("mm_refresh_token", session.refreshToken, {
      ...baseCookieOptions,
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
    });
  }
}

export function clearAuthCookies(cookies: APIContext["cookies"]) {
  cookies.delete("mm_access_token", { path: "/" });
  cookies.delete("mm_refresh_token", { path: "/" });
}
