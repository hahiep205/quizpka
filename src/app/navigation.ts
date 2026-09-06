import { useEffect, useState } from "react"

export const appRoutes = {
  home: "/",
  dashboard: "/dashboard",
  dashboardLeaderboard: "/dashboard/leaderboard",
  dashboardHistory: "/dashboard/history",
  dashboardPurchased: "/dashboard/purchased",
  dashboardNotifications: "/dashboard/notifications",
  dashboardSettings: "/dashboard/settings",
  practice: "/practice",
  practiceGuest: "/practice4guest",
  result: "/result",
  resultGuest: "/result4guest",
  authCallback: "/auth/callback",
  admin: "/admin",
  adminOverview: "/admin/overview",
  adminUsers: "/admin/users",
  adminNotifications: "/admin/notifications",
  adminPayment: "/admin/payment",
  adminSendQuiz: "/admin/sendquiz",
  adminSupports: "/admin/supports",
  adminTimeline: "/admin/timeline",
  adminAttempts: "/admin/attempts",
} as const

export type AppPath = (typeof appRoutes)[keyof typeof appRoutes]

export function getCurrentPath(): string {
  if (typeof window === "undefined") return appRoutes.home
  return window.location.pathname.replace(/\/+$/, "") || appRoutes.home
}

export function isAppPath(path: string): path is AppPath {
  return Object.values(appRoutes).includes(path as AppPath)
}

export function navigate(path: AppPath, options: { replace?: boolean; search?: string; hash?: string } = {}) {
  const target = `${path}${options.search ?? ""}${options.hash ?? ""}`
  window.history[options.replace ? "replaceState" : "pushState"](null, "", target)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

export function useAppPath() {
  const [path, setPath] = useState(getCurrentPath)
  useEffect(() => {
    const updatePath = () => setPath(getCurrentPath())
    window.addEventListener("popstate", updatePath)
    return () => window.removeEventListener("popstate", updatePath)
  }, [])
  return path
}
