import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AuthProvider, useAuth } from "@/auth/AuthProvider"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  single: vi.fn(),
  rpc: vi.fn(),
  invoke: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuthStateChange },
    from: () => ({ select: () => ({ eq: () => ({ single: mocks.single }) }) }),
    rpc: mocks.rpc,
    functions: { invoke: mocks.invoke },
  },
}))

type AuthCallback = (event: string, session: { user: Record<string, unknown> } | null) => void
let authCallback: AuthCallback

const userA = { id: "user-a", email: "a@x.com", user_metadata: {}, app_metadata: { provider: "google" } }
const userB = { id: "user-b", email: "b@x.com", user_metadata: {}, app_metadata: { provider: "google" } }

function profileRow(id: string) {
  return {
    id, email: `${id}@x.com`, display_name: "Test", avatar_url: null, role: "user",
    status: "active", blocked_reason: null, blocked_at: null, welcome_completed: true,
    school_or_faculty: null, cohort: null, preferred_language: "vi",
    sound_enabled: true, email_updates_enabled: false,
  }
}

function Probe() {
  const { status, user } = useAuth()
  return <p>{`status=${status} user=${(user?.id as string) ?? "none"}`}</p>
}

function emit(event: string, user: Record<string, unknown> | null) {
  act(() => {
    authCallback(event, user ? { user } : null)
  })
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe("AuthProvider visibility recovery", () => {
  async function mount() {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    mocks.onAuthStateChange.mockImplementation((callback: AuthCallback) => {
      authCallback = callback
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    mocks.single.mockImplementation(() => Promise.resolve({ data: profileRow(userA.id as string), error: null }))
    mocks.rpc.mockResolvedValue({ data: null, error: null })
    mocks.invoke.mockResolvedValue({ data: null, error: null })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
  }

  it("does not replay sign-in when supabase re-emits SIGNED_IN for the same user (tab visible again)", async () => {
    await mount()
    emit("INITIAL_SESSION", userA)
    expect(await screen.findByText("status=authenticated user=user-a")).not.toBeNull()
    expect(mocks.single).toHaveBeenCalledTimes(1)
    const loginInvokes = () => mocks.invoke.mock.calls.filter(([fn]) => fn === "record-login-event").length
    expect(loginInvokes()).toBe(0)

    // supabase-js _recoverAndRefresh on visibilitychange re-emits SIGNED_IN.
    emit("SIGNED_IN", userA)
    await screen.findByText("status=authenticated user=user-a")
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    expect(screen.queryByText("status=loading user=user-a")).toBeNull()
    expect(screen.getByText("status=authenticated user=user-a")).not.toBeNull()
    expect(mocks.single).toHaveBeenCalledTimes(1)
    expect(loginInvokes()).toBe(0)
  })

  it("still runs the full flow on genuine sign-out then sign-in", async () => {
    await mount()
    emit("INITIAL_SESSION", userA)
    expect(await screen.findByText("status=authenticated user=user-a")).not.toBeNull()

    emit("SIGNED_OUT", null)
    expect(await screen.findByText("status=anonymous user=none")).not.toBeNull()

    emit("SIGNED_IN", userA)
    expect(await screen.findByText("status=authenticated user=user-a")).not.toBeNull()
    expect(mocks.single).toHaveBeenCalledTimes(2)
    expect(mocks.invoke.mock.calls.filter(([fn]) => fn === "record-login-event").length).toBe(1)
  })

  it("still runs the full flow when a different user signs in", async () => {
    await mount()
    emit("INITIAL_SESSION", userA)
    expect(await screen.findByText("status=authenticated user=user-a")).not.toBeNull()

    mocks.single.mockImplementation(() => Promise.resolve({ data: profileRow(userB.id as string), error: null }))
    emit("SIGNED_IN", userB)
    expect(await screen.findByText("status=authenticated user=user-b")).not.toBeNull()
    expect(mocks.single).toHaveBeenCalledTimes(2)
    expect(mocks.invoke.mock.calls.filter(([fn]) => fn === "record-login-event").length).toBe(1)
  })
})
