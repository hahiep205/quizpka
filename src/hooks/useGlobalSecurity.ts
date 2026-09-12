import { useEffect } from "react"
import { useAuth } from "@/auth/AuthProvider"
import { isLocalSecurityBypass, SECURITY_CONFIG } from "@/security/config"
import { initBlockAll } from "@/security/blockAll"
import { initDevtoolsWatch } from "@/security/devtoolsWatch"

export function useGlobalSecurity() {
  const { user } = useAuth()
  useEffect(() => {
    // Never restrict local development: developers need DevTools, and the
    // devtools-attempt log would otherwise flood with our own keystrokes.
    if (isLocalSecurityBypass()) return
    if (!SECURITY_CONFIG.enabled) return
    if (!SECURITY_CONFIG.blockContextMenu && !SECURITY_CONFIG.blockShortcuts && !SECURITY_CONFIG.blockCopyDrag) return
    return initBlockAll()
  }, [])
  useEffect(() => {
    if (isLocalSecurityBypass()) return
    return initDevtoolsWatch(user?.id)
  }, [user?.id])
}
