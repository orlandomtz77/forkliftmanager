export const LOGIN_PATH = "/login";
export const HOME_PATH = "/dashboard";

const PUBLIC_PATHS = [LOGIN_PATH];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Optimistic redirect decision used by the proxy. This is a UX convenience:
 * real authorization happens in server code and RLS.
 */
export function getAuthRedirect(
  pathname: string,
  isAuthenticated: boolean,
): string | null {
  if (!isAuthenticated && !isPublicPath(pathname)) return LOGIN_PATH;
  if (isAuthenticated && isPublicPath(pathname)) return HOME_PATH;
  return null;
}
