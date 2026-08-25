import { useEffect, useState } from "react"
import { SECURITY_CONFIG } from "@/security/config"
import { initBlockAll } from "@/security/blockAll"
import { getDevToolsScore } from "@/security/detect"

export function useGlobalSecurity() {
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    if (!SECURITY_CONFIG.enabled) return

    const cleanupBlock = SECURITY_CONFIG.blockContextMenu || SECURITY_CONFIG.blockShortcuts || SECURITY_CONFIG.blockCopyDrag
      ? initBlockAll()
      : undefined

    let interval: number | undefined
    let resizeHandler: (() => void) | undefined

    if (SECURITY_CONFIG.detectDevTools) {
      const check = () => {
        const score = getDevToolsScore(SECURITY_CONFIG.thresholdPx)
        if (score >= 4) setLocked(true)
        else setLocked(false)
      }
      interval = window.setInterval(check, SECURITY_CONFIG.detectIntervalMs)
      resizeHandler = () => check()
      window.addEventListener("resize", resizeHandler)
      // initial check
      check()
    }

    return () => {
      cleanupBlock?.()
      if (interval) window.clearInterval(interval)
      if (resizeHandler) window.removeEventListener("resize", resizeHandler)
    }
  }, [])

  return {
    locked: SECURITY_CONFIG.lockOnDetect ? locked : false,
    setLocked,
  }
}
