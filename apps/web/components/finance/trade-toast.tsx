"use client"

// components/finance/trade-toast.tsx
//
// Confirmation toast for a completed buy/sell. Deliberately quiet: greyscale
// card, no icon, no P&L color - a trade receipt, not a celebration. It settles
// in, sits for a few seconds, and fades out on its own. Under
// prefers-reduced-motion it appears and disappears with no tween at all.
// The dismiss is owned here (timer + exit tween), but the message lives in the
// page's `receipt` state so side/mode switches can clear it instantly.

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

import { useReducedMotion } from "@/hooks/use-reduced-motion"

interface TradeToastProps {
  /** The receipt line to show; null renders nothing. */
  message: string | null
  /** Bumped per trade so an identical repeat trade still re-triggers. */
  toastKey: number
  /** Called when the toast has finished dismissing itself. */
  onDismiss: () => void
  /** How long the toast stays fully visible before dismissing. */
  holdMs?: number
}

export function TradeToast({ message, toastKey, onDismiss, holdMs = 3500 }: TradeToastProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const el = cardRef.current
      if (!el || !message) return
      if (reduced) {
        // No motion: visible immediately, gone after the hold via delayedCall
        // (still a GSAP-owned timer so useGSAP cleans it up on re-trigger).
        gsap.set(el, { opacity: 1, y: 0 })
        gsap.delayedCall(holdMs / 1000, onDismiss)
        return
      }
      const tl = gsap.timeline()
      tl.fromTo(
        el,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" },
      )
      tl.to(el, {
        opacity: 0,
        y: 4,
        duration: 0.3,
        ease: "power1.in",
        delay: holdMs / 1000,
        onComplete: onDismiss,
      })
    },
    { dependencies: [message, toastKey, reduced] },
  )

  if (!message) return null

  return (
    // Wrapper handles centering with flex (not translate) so GSAP owns the
    // card's transform. Sits above the fixed mobile tab bar.
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6"
      data-testid="trade-toast"
    >
      <div
        ref={cardRef}
        role="status"
        aria-live="polite"
        className="border-border bg-card text-foreground pointer-events-auto rounded-lg border px-4 py-2.5 font-mono text-sm tabular-nums shadow-lg"
      >
        {message}
      </div>
    </div>
  )
}
