import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";
import { logError } from "../lib/utils/error-handler.ts";

const PUBLIC_AUTH_ROUTES = ["/", "/faq", "/login", "/register", "/forgot-password", "/auth/reset-password"];
const PRIVATE_APP_PREFIX = "/app";

export const onRequest = defineMiddleware(async ({ request, url, cookies, locals }, next) => {
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  locals.supabase = supabase;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
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

  const currentPath = url.pathname;
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.includes(currentPath);
  const isPrivateRoute = currentPath.startsWith(PRIVATE_APP_PREFIX);

  if (locals.isAuthenticated && isPublicAuthRoute) {
    return Response.redirect(new URL("/app/dashboard", request.url));
  }

  if (!locals.isAuthenticated && isPrivateRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", `${currentPath}${url.search}`);
    return Response.redirect(redirectUrl);
  }

  return next();
});
