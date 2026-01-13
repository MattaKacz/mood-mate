import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";
import { createLoginRedirect } from "../lib/utils/auth-redirect";
import { logError } from "../lib/utils/error-handler.ts";

const PUBLIC_AUTH_ROUTES = ["/", "/faq", "/login", "/register", "/forgot-password", "/auth/reset-password"];
const PRIVATE_APP_PREFIX = "/app";
const PUBLIC_AUTH_API_PREFIX = "/api/auth/";

export const onRequest = defineMiddleware(async ({ request, url, cookies, locals }, next) => {
  const currentPath = url.pathname;
  const isPublicAuthApiRoute = currentPath.startsWith(PUBLIC_AUTH_API_PREFIX);

  // Auth API endpoints nie wymagają wstępnego sprawdzania sesji
  // (login/register/reset itp.) — unikamy szumu "Auth session missing!".
  if (isPublicAuthApiRoute) {
    return next();
  }

  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  locals.supabase = supabase;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    logError("middleware:getUser", error, { path: url.pathname });
    await supabase.auth.signOut();
  }

  locals.user = user
    ? {
        email: user.email ?? "",
        id: user.id,
      }
    : undefined;

  locals.isAuthenticated = Boolean(user);

  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.includes(currentPath);
  const isPrivateRoute = currentPath.startsWith(PRIVATE_APP_PREFIX);

  if (locals.isAuthenticated && isPublicAuthRoute) {
    return Response.redirect(new URL("/app/dashboard", request.url));
  }

  if (!locals.isAuthenticated && isPrivateRoute) {
    return createLoginRedirect(url);
  }

  return next();
});
