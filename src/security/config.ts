export const SECURITY_CONFIG = {
  enabled: true,
  scope: "global" as const,
  blockContextMenu: true,
  blockShortcuts: true,
  blockCopyDrag: false,
  /** Security restrictions apply everywhere EXCEPT local development hosts. */
  bypassHosts: ["localhost", "127.0.0.1", "[::1]", ""],
} as const

/** True on localhost/dev where developers need DevTools (never block there). */
export function isLocalSecurityBypass(hostname: string = window.location.hostname): boolean {
  return (SECURITY_CONFIG.bypassHosts as readonly string[]).includes(hostname)
}
