/**
 * Route prefixes that sit behind a sign-in.
 *
 * Shared rather than repeated: the shell uses this to hide the marketing header
 * and footer, and analytics uses it to decide what may be reported. Those two
 * answers must never disagree — a page that hides the public chrome because it
 * is private should not simultaneously be sent to Google.
 */
export const PORTAL_PREFIXES = ['/admin', '/staff', '/technician', '/client'] as const;

/** The path with any query string and fragment removed. */
export function pathOf(url: string): string {
  return url.split(/[?#]/)[0] || url;
}

export function isPortalRoute(url: string): boolean {
  const path = pathOf(url);
  return PORTAL_PREFIXES.some((portal) => path === portal || path.startsWith(`${portal}/`));
}
