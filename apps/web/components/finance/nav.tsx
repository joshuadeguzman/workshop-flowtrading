"use client"

// components/finance/nav.tsx
//
// Two destinations, because the app is two destinations: your Portfolio and the
// Markets (screener). Stock detail and the trade screen are drill-downs reached
// by tapping a stock, so they carry their own back affordance and do not need a
// tab. Mobile-first: the tab bar lives at the bottom, in thumb reach; on desktop
// the same links sit in the header.

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LineChart, Wallet } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { HORIZONS } from "@/lib/simulate"
import { useSimulation } from "@/contexts/simulation"

const TABS = [
  { href: "/", label: "Portfolio", icon: Wallet },
  { href: "/screener", label: "Markets", icon: LineChart },
] as const

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href)
}

export function SiteHeader() {
  const pathname = usePathname()
  const { horizon, setHorizon } = useSimulation()

  return (
    <header className="bg-background/50 sticky top-0 z-30 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-baseline gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="font-mono text-[15px] font-semibold tracking-tight">
            <span className="text-foreground">Flow</span>
            <span className="text-muted-foreground">Trading</span>
          </span>
          <span className="border-border text-muted-foreground hidden rounded border px-1 py-px font-mono text-[9px] tracking-widest uppercase sm:inline-block">
            Paper
          </span>
        </Link>

        {/* Desktop tabs */}
        <nav className="hidden items-center gap-1 md:flex">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon className="size-4" aria-hidden="true" />
                {tab.label}
              </Link>
            )
          })}
        </nav>

        {/* Simulate horizon filters (moved here from the old standalone bar). */}
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Simulate price horizon"
            className="border-border flex items-center gap-0.5 rounded-lg border p-0.5"
          >
            {HORIZONS.map((h) => {
              const active = horizon === h.key
              return (
                <button
                  key={h.key}
                  onClick={() => setHorizon(h.key)}
                  aria-pressed={active}
                  title={h.long}
                  className={cn(
                    "rounded-md px-2 py-0.5 font-mono text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {h.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </header>
  )
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className="border-border/70 bg-background/90 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-3xl grid-cols-2">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <tab.icon className="size-5" aria-hidden="true" />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
