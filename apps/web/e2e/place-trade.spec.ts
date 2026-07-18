// e2e/place-trade.spec.ts
//
// End-to-end buy/sell trade, driven through the REAL browser UI at
// /trade/[symbol]. This is the "watch it happen" suite: run with
//   npx playwright test --ui        (or --headed)
// to see each step. Screenshots for every beat are written to
// docs/e2e/place-trade/ so they can be attached to a PR.
//
// Kept deterministic per AGENTS.md: clear localStorage first and trade at the
// Live seeded price (NVDA = $207.40), so every asserted number is checkable.

import { test, expect } from "@playwright/test"
import { mkdirSync } from "node:fs"

const SHOTS = "docs/e2e/place-trade"
const SYM = "NVDA"

// Start every test from a clean $100,000 account on the trade screen.
test.beforeEach(async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true })
  await page.goto(`/trade/${SYM}`)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test("place a BUY in dollars and see the position open", async ({ page }) => {
  // Buy defaults to dollars mode. Enter $5,000 of NVDA.
  await page.getByRole("button", { name: "Dollars" }).click()
  await page.getByLabel("Dollar amount").fill("5000")

  // Cost preview appears before confirming.
  await expect(page.getByText("Cash after buy")).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/1-buy-preview.png` })

  // Confirm the trade.
  await page.getByRole("button", { name: new RegExp(`Buy ${SYM}`) }).click()

  // Receipt confirms the fill, and the position panel now shows the holding.
  await expect(page.getByText(/Bought .* NVDA at \$207\.40/)).toBeVisible()
  const position = page.getByText("Your position").locator("..")
  await expect(position.getByText("Avg cost")).toBeVisible()
  await expect(position.getByText("$207.40")).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/2-buy-receipt.png` })

  // The holding also surfaces on the portfolio dashboard.
  await page.goto("/")
  await expect(page.getByText(SYM).first()).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/3-dashboard.png` })
})

test("place a SELL and watch the position shrink", async ({ page }) => {
  // First open a position: buy 10 shares.
  await page.getByRole("button", { name: "Shares" }).click()
  await page.getByLabel("Number of shares").fill("10")
  await page.getByRole("button", { name: new RegExp(`Buy ${SYM}`) }).click()
  await expect(page.getByText(/Bought 10 NVDA/)).toBeVisible()

  // Switch to the Sell side (this tab also flips the input to shares).
  await page.getByRole("tab", { name: "sell" }).click()
  await page.getByLabel("Number of shares").fill("4")
  await page.screenshot({ path: `${SHOTS}/4-sell-preview.png` })

  await page.getByRole("button", { name: new RegExp(`Sell ${SYM}`) }).click()

  // Sold 4, 6 remain. Avg cost is unchanged by a sell.
  await expect(page.getByText(/Sold 4 NVDA at \$207\.40/)).toBeVisible()
  const position = page.getByText("Your position").locator("..")
  await expect(position.getByText("6", { exact: false })).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/5-sell-receipt.png` })
})

test("a trade that can't execute is blocked before the click", async ({ page }) => {
  // Try to buy far more than the $100,000 balance allows.
  await page.getByRole("button", { name: "Dollars" }).click()
  await page.getByLabel("Dollar amount").fill("999999")

  // The reason shows and the Buy button is disabled: no bad trade is possible.
  await expect(page.getByText(/Not enough cash/)).toBeVisible()
  await expect(page.getByRole("button", { name: new RegExp(`Buy ${SYM}`) })).toBeDisabled()
  await page.screenshot({ path: `${SHOTS}/6-blocked.png` })
})
