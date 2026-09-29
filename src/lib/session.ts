import { AUTH } from "@/config/protocol";

/** True when this browser session already has the marker (any tab of this browser). */
export function hasBrowserSession(): boolean {
  return typeof document !== "undefined" && document.cookie.split("; ").some((c) => c.startsWith(`${AUTH.sessionCookie}=`));
}

/** Session cookie: no Max-Age/Expires, so it is dropped when the browser session ends. */
export function markBrowserSession(): void {
  if (typeof document !== "undefined") document.cookie = `${AUTH.sessionCookie}=1; path=/; SameSite=Lax`;
}
