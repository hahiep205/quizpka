export const SECURITY_CONFIG = {
  enabled: true,
  scope: "global" as const,
  blockContextMenu: true,
  blockShortcuts: true,
  blockCopyDrag: false,
  detectDevTools: true,
  lockOnDetect: true,
  detectIntervalMs: 2000,
  thresholdPx: 160,
} as const
