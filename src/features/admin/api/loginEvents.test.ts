import { describe, expect, it, vi } from "vitest"

const query = vi.fn()

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: query,
          }),
        }),
      }),
    }),
  },
}))

import { fetchUserLoginEvents } from "./loginEvents"

describe("fetchUserLoginEvents", () => {
  it("normalizes valid rows and ignores malformed rows", async () => {
    query.mockResolvedValueOnce({
      data: [
        { id: 2, logged_in_at: "2026-10-02T12:00:00Z", ip_address: "203.0.113.10", user_agent: "Chrome", provider: "google" },
        { id: "bad", logged_in_at: "2026-10-02T12:01:00Z", ip_address: "203.0.113.11" },
      ],
      error: null,
    })

    await expect(fetchUserLoginEvents("user-1")).resolves.toEqual([
      { id: 2, loggedInAt: "2026-10-02T12:00:00Z", ipAddress: "203.0.113.10", userAgent: "Chrome", provider: "google" },
    ])
    expect(query).toHaveBeenCalledWith(50)
  })
})
