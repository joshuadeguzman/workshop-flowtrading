"use client"

// components/finance/page-transition.tsx
//
// A light fade between routes. Keying the wrapper on the pathname remounts it on
// every navigation, which re-triggers the CSS animation. Opacity only (see the
// keyframe note in globals.css), and disabled entirely under reduced motion.

import { usePathname } from "next/navigation"

import { useReducedMotion } from "@/hooks/use-reduced-motion"

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduced = useReducedMotion()

  return (
    <div
      key={pathname}
      style={reduced ? undefined : { animation: "ft-page-enter 260ms ease-out both" }}
    >
      {children}
    </div>
  )
}
