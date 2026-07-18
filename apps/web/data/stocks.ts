// data/stocks.ts
//
// SEEDED, STATIC DATA — NOT LIVE MARKET DATA.
// Snapshot: 2026-07-16 close (last completed session before the workshop).
// Source: stockanalysis.com daily OHLC (data from S&P Global Market Intelligence),
// cross-checked against Macrotrends, Investing.com, CompaniesMarketCap, Bloomberg.
//
// Universe: the 10 most-OWNED US retail stocks (by holdings, not market cap).
// That's why AMC and Ford sit next to the mega-caps — this is what people
// actually hold, not what's biggest.
//
// DELIBERATE GAPS — do not "fix" these by guessing:
//  - Q2 open (2026-04-01 close) could not be sourced from any free provider.
//    So quarterOpen and quarterChangePct are OMITTED, not zeroed, not estimated.
//  - history is 3 real month-end points, not 12. A short honest series beats a
//    long invented one. Draw a trend line, not a detailed sparkline.
//  - AMC's feed lagged: its price is as of 2026-07-10, not 07-16. Hence priceAsOf
//    being per-stock rather than a single file-level constant.
//  - marketCap is a point-in-time approximation. It moves hourly. Don't lean on it.
//
// Context for the room: a tech selloff was underway 2026-07-16/17. NFLX fell ~9-10%
// premarket on 07-17 after weak Q2 guidance. NVDA, GOOGL, META all dropped ~3-4%.
// Live quotes WILL differ from this file. That is expected, not a bug.

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  marketCap: number;
  currentPrice: number;
  priceAsOf: string; // ISO date — per-stock, because AMC lagged
  quarterClose: number; // 2026-06-30 close
  quarterOpen?: number; // UNAVAILABLE for all — see header
  quarterChangePct?: number; // UNAVAILABLE — cannot compute without quarterOpen
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  history: { date: string; close: number }[];
}

export const STOCKS: Stock[] = [
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    sector: "Information Technology",
    marketCap: 5.02e12,
    currentPrice: 207.4,
    priceAsOf: "2026-07-16",
    quarterClose: 200.09,
    fiftyTwoWeekHigh: 236.54,
    fiftyTwoWeekLow: 164.07,
    history: [
      { date: "2026-05-29", close: 211.14 },
      { date: "2026-06-30", close: 200.09 },
      { date: "2026-07-16", close: 207.4 },
    ],
  },
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    sector: "Information Technology",
    marketCap: 4.9e12,
    currentPrice: 333.26,
    priceAsOf: "2026-07-16",
    quarterClose: 289.36,
    fiftyTwoWeekHigh: 334.68,
    fiftyTwoWeekLow: 201.5,
    history: [
      { date: "2026-05-29", close: 312.06 },
      { date: "2026-06-30", close: 289.36 },
      { date: "2026-07-16", close: 333.26 },
    ],
  },
  {
    symbol: "TSLA",
    name: "Tesla, Inc.",
    sector: "Consumer Discretionary",
    marketCap: 1.48e12,
    currentPrice: 391.06,
    priceAsOf: "2026-07-16",
    quarterClose: 420.6,
    fiftyTwoWeekHigh: 498.83,
    fiftyTwoWeekLow: 297.82,
    history: [
      { date: "2026-05-29", close: 435.79 },
      { date: "2026-06-30", close: 420.6 },
      { date: "2026-07-16", close: 391.06 },
    ],
  },
  {
    symbol: "AMZN",
    name: "Amazon.com, Inc.",
    sector: "Consumer Discretionary",
    marketCap: 2.69e12,
    currentPrice: 249.89,
    priceAsOf: "2026-07-16",
    quarterClose: 238.34,
    fiftyTwoWeekHigh: 278.56,
    fiftyTwoWeekLow: 196.0,
    history: [
      { date: "2026-05-29", close: 270.64 },
      { date: "2026-06-30", close: 238.34 },
      { date: "2026-07-16", close: 249.89 },
    ],
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    sector: "Information Technology",
    marketCap: 2.98e12,
    currentPrice: 401.1,
    priceAsOf: "2026-07-16",
    quarterClose: 373.02,
    fiftyTwoWeekHigh: 555.45,
    fiftyTwoWeekLow: 349.2,
    history: [
      { date: "2026-05-29", close: 450.24 },
      { date: "2026-06-30", close: 373.02 },
      { date: "2026-07-16", close: 401.1 },
    ],
  },
  {
    symbol: "AMC",
    name: "AMC Entertainment Holdings, Inc.",
    sector: "Communication Services",
    marketCap: 1.75e9,
    currentPrice: 1.89,
    priceAsOf: "2026-07-10", // NOTE: feed lagged. Not 07-16.
    quarterClose: 1.9,
    fiftyTwoWeekHigh: 3.6,
    fiftyTwoWeekLow: 0.93,
    history: [
      { date: "2026-05-29", close: 1.73 },
      { date: "2026-06-30", close: 1.9 },
      { date: "2026-07-10", close: 1.89 },
    ],
  },
  {
    symbol: "F",
    name: "Ford Motor Company",
    sector: "Consumer Discretionary",
    marketCap: 56e9,
    currentPrice: 14.11,
    priceAsOf: "2026-07-16",
    quarterClose: 13.9,
    // Sources disagree: Macrotrends 17.78/10.68 vs Investing.com 14.80/9.86.
    // Using Macrotrends — validated by Ford's own 2026-05-29 intraday high of 17.78.
    fiftyTwoWeekHigh: 17.78,
    fiftyTwoWeekLow: 10.68,
    history: [
      { date: "2026-05-29", close: 17.44 },
      { date: "2026-06-30", close: 13.9 },
      { date: "2026-07-16", close: 14.11 },
    ],
  },
  {
    symbol: "META",
    name: "Meta Platforms, Inc.",
    sector: "Communication Services",
    marketCap: 1.63e12,
    currentPrice: 664.54,
    priceAsOf: "2026-07-16",
    quarterClose: 563.29,
    fiftyTwoWeekHigh: 796.25,
    fiftyTwoWeekLow: 520.26,
    history: [
      { date: "2026-05-29", close: 632.51 },
      { date: "2026-06-30", close: 563.29 },
      { date: "2026-07-16", close: 664.54 },
    ],
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc. (Class A)",
    sector: "Communication Services",
    marketCap: 4.33e12,
    currentPrice: 354.46,
    priceAsOf: "2026-07-16",
    // Note: quarterClose is ABOVE currentPrice. Correct — mid-July AI selloff.
    quarterClose: 357.37,
    fiftyTwoWeekHigh: 408.61,
    fiftyTwoWeekLow: 183.71,
    history: [
      { date: "2026-05-29", close: 380.34 },
      { date: "2026-06-30", close: 357.37 },
      { date: "2026-07-16", close: 354.46 },
    ],
  },
  {
    symbol: "NFLX",
    name: "Netflix, Inc.",
    sector: "Communication Services",
    marketCap: 310.26e9,
    currentPrice: 74.35,
    priceAsOf: "2026-07-16",
    quarterClose: 71.4,
    fiftyTwoWeekHigh: 126.71,
    fiftyTwoWeekLow: 70.86,
    history: [
      { date: "2026-05-29", close: 86.02 },
      { date: "2026-06-30", close: 71.4 },
      { date: "2026-07-16", close: 74.35 },
    ],
  },
];
