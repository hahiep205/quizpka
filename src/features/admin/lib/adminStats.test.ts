import { describe, expect, it } from "vitest"
import {
  computeAdminKpis,
  filterAdminUsers,
  filterByTab,
  parseAdminUsers,
  sortAdminUsers,
  toAdminCsv,
} from "@/features/admin/lib/adminStats"

const profiles = [
  { id: "u1", email: "a@test.com", display_name: "An", avatar_url: null, role: "user", status: "active", created_at: new Date(Date.now() - 1000).toISOString() },
  { id: "u2", email: "b@test.com", display_name: "Binh", avatar_url: null, role: "admin", status: "blocked", created_at: "2020-01-01T00:00:00.000Z" },
  { id: "u3", email: "c@test.com", display_name: null, avatar_url: null, role: "user", status: "active", created_at: null },
]

const stats = [
  { user_id: "u1", attempts: 5, average_accuracy: 80, total_duration_seconds: 600, subjects_reviewed: 3, points: 100, week_attempts: 2, week_average_accuracy: 90, week_points: 40, visible: true, updated_at: new Date().toISOString() },
  { user_id: "u2", attempts: 10, average_accuracy: 50, total_duration_seconds: 100, subjects_reviewed: 1, points: 50, week_attempts: 0, week_average_accuracy: 0, week_points: 0, visible: true, updated_at: "2020-02-01T00:00:00.000Z" },
]

describe("adminStats P0", () => {
  it("joins profiles with stats, defaults missing stats to zero", () => {
    const users = parseAdminUsers(profiles, stats)
    expect(users).toHaveLength(3)
    expect(users.find((u) => u.id === "u1")?.points).toBe(100)
    expect(users.find((u) => u.id === "u3")?.attempts).toBe(0)
    expect(users.find((u) => u.id === "u3")?.lastActiveAt).toBeNull()
  })

  it("filters tabs: logined vs active-account vs active-7d", () => {
    const users = parseAdminUsers(profiles, stats)
    expect(filterByTab(users, "logined")).toHaveLength(3)
    expect(filterByTab(users, "active-account").map((u) => u.id).sort()).toEqual(["u1", "u3"])
    // u1 active gần đây, u3 chưa từng học -> không tính engagement
    expect(filterByTab(users, "active-7d").map((u) => u.id)).toEqual(["u1"])
  })

  it("searches by email/name and filters role/status", () => {
    const users = parseAdminUsers(profiles, stats)
    expect(filterAdminUsers(users, { query: "b@test" })).toHaveLength(1)
    expect(filterAdminUsers(users, { role: "admin" }).map((u) => u.id)).toEqual(["u2"])
    expect(filterAdminUsers(users, { status: "blocked" }).map((u) => u.id)).toEqual(["u2"])
  })

  it("sorts and computes kpis", () => {
    const users = parseAdminUsers(profiles, stats)
    expect(sortAdminUsers(users, "attempts", "desc")[0]?.id).toBe("u2")
    const kpis = computeAdminKpis(users)
    expect(kpis.totalLogined).toBe(3)
    expect(kpis.activeAccount).toBe(2)
    expect(kpis.blockedAccount).toBe(1)
    expect(kpis.totalAttempts).toBe(15)
  })

  it("exports csv with header", () => {
    const users = parseAdminUsers(profiles, stats)
    const csv = toAdminCsv(users)
    expect(csv.split("\n")[0]).toContain("email")
    expect(csv).toContain("u1")
  })
})
