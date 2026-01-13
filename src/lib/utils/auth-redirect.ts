export function createLoginRedirect(currentUrl: URL) {
  const redirectUrl = new URL("/login", currentUrl);
  const redirectTo = `${currentUrl.pathname}${currentUrl.search}`;
  redirectUrl.searchParams.set("redirectTo", redirectTo);

  return Response.redirect(redirectUrl);
}

export function ensureAuthenticated(locals: App.Locals, currentUrl: URL) {
  const supabase = locals.supabase;
  const user = locals.user;

  if (!supabase || !locals.isAuthenticated || !user) {
    return { redirect: createLoginRedirect(currentUrl) };
  }

  return { supabase, user };
}
