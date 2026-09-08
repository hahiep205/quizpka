import { useEffect } from "react"
import { useAuth } from "@/auth/AuthProvider"
import { SECURITY_CONFIG } from "@/security/config"
import { initBlockAll } from "@/security/blockAll"
import { initDevtoolsWatch } from "@/security/devtoolsWatch"

export function useGlobalSecurity() {
  const { user } = useAuth()
  useEffect(() => {
    if (!SECURITY_CONFIG.enabled) return
    if (!SECURITY_CONFIG.blockContextMenu && !SECURITY_CONFIG.blockShortcuts && !SECURITY_CONFIG.blockCopyDrag) return
    return initBlockAll()
  }, [])
  useEffect(() => initDevtoolsWatch(user?.id), [user?.id])
}
