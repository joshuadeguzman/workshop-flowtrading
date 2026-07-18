// components/finance/market-movers.tsx
//
// Two short lists, biggest gainers and biggest losers by since-Q2 change. The
// parent computes and ranks them (so they re-rank when you change the simulate
// horizon); this just renders. Change is P&L, so it carries sign + arrow + color.

import Link from "next/link"

import { Pnl } from "@/components/finance/pnl"

export interface Mover {
  symbol: string
  changePct: number
}

export function MarketMovers({ gainers, losers }: { gainers: Mover[]; losers: Mover[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <MoverColumn title="Gainers" movers={gainers} />
      <MoverColumn title="Losers" movers={losers} />
    </div>
  )
}

function MoverColumn({ title, movers }: { title: string; movers: Mover[] }) {
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs">{title}</p>
      <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
        {movers.map((m) => (
          <li key={m.symbol}>
            <Link
              href={`/stock/${m.symbol}`}
              className="hover:bg-secondary/40 focus-visible:bg-secondary/40 flex items-center justify-between gap-2 px-3 py-2 outline-none transition-colors"
            >
              <span className="font-mono text-sm font-semibold">{m.symbol}</span>
              <Pnl value={m.changePct} as="percent" className="text-xs" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
