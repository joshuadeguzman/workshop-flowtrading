"use client"

// hooks/use-reduced-motion.ts
//
// prefers-reduced-motion is a hard kill switch for every animation in the app,
// so it gets one honest source of truth. Starts `false` (matches SSR) and reads
// the real media query after mount, then tracks changes.

import { useEffect, useState } from "react"

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    // Deliberate: the real preference is only knowable after mount. Starting
    // false keeps SSR and first client render identical (see file header).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  return reduced
}
