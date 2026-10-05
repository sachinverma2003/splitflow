/**
 * Client-side admin session storage and request header utilities.
 * Ensures admin authentication persists across page refreshes, mobile browsers,
 * and PWA webviews even if third-party cookies or cookie jars are restricted.
 */

export function getAdminToken(groupSlug: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`sf_admin_token_${groupSlug}`);
}

export function setAdminToken(groupSlug: string, token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(`sf_admin_token_${groupSlug}`, token);
  } else {
    localStorage.removeItem(`sf_admin_token_${groupSlug}`);
  }
}

export function getAdminHeaders(groupSlug: string): Record<string, string> {
  const token = getAdminToken(groupSlug);
  return token ? { "x-admin-token": token } : {};
}
