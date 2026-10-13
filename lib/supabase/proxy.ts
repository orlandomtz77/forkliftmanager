import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { getAuthRedirect } from "@/lib/auth/routes";

type CookieToSet = {
  name: string;
  value: string;
  options: Parameters<NextResponse["cookies"]["set"]>[2];
};

/**
 * Refreshes the Supabase session cookie and applies optimistic auth redirects.
 */
export async function updateSession(request: NextRequest) {
  let pendingCookies: CookieToSet[] = [];
  let pendingHeaders: Record<string, string> = {};

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Make refreshed tokens visible to Server Components in this request.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          pendingCookies = cookiesToSet;
          pendingHeaders = headers;
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims(): it validates
  // the JWT and refreshes the session when needed.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  const redirectTo = getAuthRedirect(request.nextUrl.pathname, isAuthenticated);
  let response: NextResponse;
  if (redirectTo) {
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    url.search = "";
    response = NextResponse.redirect(url);
  } else {
    response = NextResponse.next({ request });
  }

  pendingCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  // Prevent CDNs from caching responses that carry auth cookies.
  Object.entries(pendingHeaders).forEach(([key, value]) =>
    response.headers.set(key, value),
  );

  return response;
}
