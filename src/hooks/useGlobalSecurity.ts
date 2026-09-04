import { useEffect } from "react"
import { SECURITY_CONFIG } from "@/security/config"
import { initBlockAll } from "@/security/blockAll"

export function useGlobalSecurity() {
  useEffect(() => {
    if (!SECURITY_CONFIG.enabled) return
    if (!SECURITY_CONFIG.blockContextMenu && !SECURITY_CONFIG.blockShortcuts && !SECURITY_CONFIG.blockCopyDrag) return
    return initBlockAll()
  }, [])
}
