import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import "@workspace/ui/globals.css"
import { cn } from "@workspace/ui/lib/utils"

import { BottomNav, SiteHeader } from "@/components/finance/nav"
import { PageTransition } from "@/components/finance/page-transition"
import { SimulationProvider } from "@/contexts/simulation"

const fontSans = Geist({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "FlowTrading — paper trading",
  description:
    "Paper-trade 10 US stocks with virtual cash. Seeded prices, snapshot Jul 16 2026. Nothing leaves your browser.",
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Dark is locked. This is the one app where dark is unambiguously correct:
  // gain-green and loss-red only read properly against a dark surface, and
  // every real trading app makes the same call. No toggle, so `dark` is fixed
  // on <html> and there is no theme state to hydrate or mismatch.
  return (
    <html
      lang="en"
      className={cn("dark antialiased", fontSans.variable, fontMono.variable)}
      style={{ colorScheme: "dark" }}
    >
      <body className="bg-background text-foreground min-h-dvh font-sans">
        <SimulationProvider>
          <SiteHeader />
          {/* Bottom padding clears the fixed mobile tab bar and any sticky
              page footer (e.g. the Buy/Sell bar on the stock detail page). */}
          <main className="mx-auto max-w-3xl px-4 pt-5 pb-24">
            <PageTransition>{children}</PageTransition>
            <footer className="border-border/60 text-muted-foreground mt-10 border-t pt-4 text-center text-[11px] leading-relaxed">
              Prices and charts are simulated / mock data for demonstration only. Not investment
              advice.
            </footer>
          </main>
          <BottomNav />
        </SimulationProvider>
      </body>
    </html>
  )
}
