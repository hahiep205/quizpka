export const SECURITY_CONFIG = {
  enabled: true,
  scope: "global" as const,
  blockContextMenu: true,
  blockShortcuts: true,
  // Bật chặn phím F12 trực tiếp
  blockF12: true,
  blockCopyDrag: false,
  detectDevTools: true,
  lockOnDetect: true,
  detectIntervalMs: 1500,
  thresholdPx: 120,
} as const
