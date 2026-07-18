// e2e/trade-history.spec.ts
//
// End-to-end trade history, driven through the REAL browser UI. We place a buy
// and a sell on the actual /trade screen, then reach /history the way a user
// would (the Dashboard "History" link) and confirm the log matches what we did:
// both executions present, newest first, totals formatted as money.
//
// Deterministic per AGENTS.md: clear localStorage first and trade at the Live
// seeded price (NVDA = $207.40), so every asserted number is checkable by hand.

import { test, expect } from "@playwright/test"
import { mkdirSync } from "node:fs"

const SHOTS = "docs/e2e/trade-history"
const SYM = "NVDA"

test.beforeEach(async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true })
  await page.goto(`/trade/${SYM}`)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test("the empty log reads clean before any trade", async ({ page }) => {
  await page.goto("/history")
  await expect(page.getByText("No trades yet.")).toBeVisible()
  // Nothing to link to yet: the Dashboard hides its History affordance.
  await page.goto("/")
  await expect(page.getByRole("link", { name: /History/ })).toHaveCount(0)
  await page.screenshot({ path: `${SHOTS}/1-empty.png` })
})

test("a buy and a sell both appear in the log, newest first", async ({ page }) => {
  // Buy 10 shares.
  await page.getByRole("button", { name: "Shares" }).click()
  await page.getByLabel("Number of shares").fill("10")
  await page.getByRole("button", { name: new RegExp(`Buy ${SYM}`) }).click()
  await expect(page.getByText(/Bought 10 NVDA/)).toBeVisible()

  // Sell 4 shares (the newer execution).
  await page.getByRole("tab", { name: "sell" }).click()
  await page.getByLabel("Number of shares").fill("4")
  await page.getByRole("button", { name: new RegExp(`Sell ${SYM}`) }).click()
  await expect(page.getByText(/Sold 4 NVDA/)).toBeVisible()

  // Reach the log the way a user does: from the Dashboard link.
  await page.goto("/")
  await page.getByRole("link", { name: /History/ }).click()
  await expect(page).toHaveURL(/\/history$/)
  await page.screenshot({ path: `${SHOTS}/2-history.png`, fullPage: true })

  // Both executions present, and counted.
  await expect(page.getByText("2 trades")).toBeVisible()

  // Newest first, with money-formatted totals (10 * 207.40, 4 * 207.40).
  // Row 0 is the header; the SELL (newer) leads, then the BUY. Scoping the
  // assertions to rows keeps them off the intro copy, which also says "buy".
  const rows = page.getByRole("row")
  await expect(rows.nth(1)).toContainText("Sell")
  await expect(rows.nth(1)).toContainText("$829.60")
  await expect(rows.nth(2)).toContainText("Buy")
  await expect(rows.nth(2)).toContainText("$2,074.00")
})
