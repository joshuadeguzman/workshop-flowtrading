// e2e/trade-toast.spec.ts
//
// Issue #6: after a buy or sell, a small greyscale toast confirms the trade
// (symbol, shares, total), then auto-dismisses on its own. Acceptance:
//   - appears then auto-dismisses; no gamification
//   - honors prefers-reduced-motion (still appears and still auto-dismisses)
// Deterministic per AGENTS.md: clean localStorage, Live seeded price
// (NVDA = $207.40), so every asserted number is checkable.

import { test, expect } from "@playwright/test"
import { mkdirSync } from "node:fs"

const SHOTS = "docs/e2e/issue-6"
const SYM = "NVDA"
const TOAST = '[data-testid="trade-toast"]'

test.beforeEach(async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true })
  await page.goto(`/trade/${SYM}`)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test("BUY shows a toast with symbol, shares and total, then auto-dismisses", async ({ page }) => {
  await page.getByRole("button", { name: "Shares" }).click()
  await page.getByLabel("Number of shares").fill("10")
  await page.getByRole("button", { name: new RegExp(`Buy ${SYM}`) }).click()

  // Toast carries the full receipt: verb, shares, symbol, price, total.
  const toast = page.locator(TOAST)
  await expect(toast).toBeVisible()
  await expect(toast).toContainText("Bought 10 NVDA at $207.40 · $2,074.00")
  await page.screenshot({ path: `${SHOTS}/1-buy-toast.png` })

  // It dismisses itself; nothing to click.
  await expect(toast).toBeHidden({ timeout: 6000 })
  await page.screenshot({ path: `${SHOTS}/2-buy-toast-dismissed.png` })
})

test("SELL shows the toast too", async ({ page }) => {
  await page.getByRole("button", { name: "Shares" }).click()
  await page.getByLabel("Number of shares").fill("10")
  await page.getByRole("button", { name: new RegExp(`Buy ${SYM}`) }).click()
  await expect(page.locator(TOAST)).toContainText("Bought 10 NVDA")

  await page.getByRole("tab", { name: "sell" }).click()
  await page.getByLabel("Number of shares").fill("4")
  await page.getByRole("button", { name: new RegExp(`Sell ${SYM}`) }).click()

  const toast = page.locator(TOAST)
  await expect(toast).toContainText("Sold 4 NVDA at $207.40 · $829.60")
  await page.screenshot({ path: `${SHOTS}/3-sell-toast.png` })
  await expect(toast).toBeHidden({ timeout: 6000 })
})

test("honors prefers-reduced-motion: toast still appears and auto-dismisses", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })

  await page.getByRole("button", { name: "Shares" }).click()
  await page.getByLabel("Number of shares").fill("2")
  await page.getByRole("button", { name: new RegExp(`Buy ${SYM}`) }).click()

  const toast = page.locator(TOAST)
  await expect(toast).toBeVisible()
  await expect(toast).toContainText("Bought 2 NVDA at $207.40 · $414.80")
  // With motion off the card must be fully opaque immediately (no tween).
  await expect(toast.locator('[role="status"]')).toHaveCSS("opacity", "1")
  await page.screenshot({ path: `${SHOTS}/4-reduced-motion-toast.png` })

  await expect(toast).toBeHidden({ timeout: 6000 })
})
