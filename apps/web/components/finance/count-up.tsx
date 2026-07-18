"use client"

// components/finance/count-up.tsx
//
// Everything in this app is local, so every value change is instant. The
// count-up is not a loading disguise; it is a ~200ms cue that says "this number
// just changed, look here". tabular-nums keeps the width fixed so digits never
// jitter sideways as they tick. Under prefers-reduced-motion it snaps.

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

import { cn } from "@workspace/ui/lib/utils"

import { useReducedMotion } from "@/hooks/use-reduced-motion"

interface CountUpProps {
  value: number
  /** How to render the tweened number at each frame (money, percent, etc.). */
  format: (n: number) => string
  className?: string
  durationMs?: number
}

export function CountUp({ value, format, className, durationMs = 200 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  // The number we last settled on. Starts equal to `value` so the first paint
  // (and the SSR text below) does not animate from zero.
  const prev = useRef(value)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      if (reduced || prev.current === value) {
        el.textContent = format(value)
        prev.current = value
        return
      }
      const proxy = { n: prev.current }
      gsap.to(proxy, {
        n: value,
        duration: durationMs / 1000,
        ease: "power1.out",
        onUpdate: () => {
          el.textContent = format(proxy.n)
        },
        onComplete: () => {
          prev.current = value
        },
      })
    },
    { dependencies: [value, reduced] },
  )

  // SSR / first paint renders the formatted value directly, so there is no
  // flash of an empty or zeroed number before hydration.
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {format(value)}
    </span>
  )
}
