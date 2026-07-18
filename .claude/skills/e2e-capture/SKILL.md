---
name: e2e-capture
description: >
  Drive a user flow end to end with Playwright and capture proof: screenshots at
  each key step plus a video recording, saved as artifacts you can attach to a PR.
  Use to prove a feature works in a real browser, or to produce before/after visuals
  for a review.
---

# E2e + screenshot / recording capture (Playwright)

Prove a flow works in a real browser and leave visual evidence. This drives the
app with Playwright, snaps screenshots at the moments that matter, and records a
video, so a reviewer (or a PR) can see the feature rather than take your word.

## 1. Set up Playwright (once)

```bash
cd apps/web
npm i -D @playwright/test && npx playwright install chromium
```

Create `apps/web/playwright.config.ts` that starts the dev server and records
everything:

```ts
import { defineConfig } from "@playwright/test"
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.artifacts",         // videos + trace land here
  webServer: { command: "npx next dev", url: "http://localhost:3000", reuseExistingServer: true },
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "on",
    video: "on",                          // .webm recording per test
    trace: "on-first-retry",
  },
})
```

## 2. Write a spec that captures the flow

Reset state, walk the flow, and screenshot the beats. Put named screenshots
somewhere committable (`docs/e2e/<feature>/`) so they can be embedded in a PR.

```ts
import { test } from "@playwright/test"
import { mkdirSync } from "node:fs"

test("buy in dollars shows the position", async ({ page }) => {
  mkdirSync("docs/e2e/dollar-buy", { recursive: true })
  await page.goto("/trade/NVDA")
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByRole("button", { name: "Dollars" }).click()
  await page.getByLabel("Dollar amount").fill("5000")
  await page.screenshot({ path: "docs/e2e/dollar-buy/1-preview.png" })   // cost preview
  await page.getByRole("button", { name: /Buy NVDA/ }).click()
  await page.screenshot({ path: "docs/e2e/dollar-buy/2-receipt.png" })   // after trade
  await page.goto("/")
  await page.screenshot({ path: "docs/e2e/dollar-buy/3-dashboard.png" }) // holding shows
})
```

## 3. Run and collect

```bash
cd apps/web && npx playwright test
```

Artifacts:
- **Screenshots** you named -> `apps/web/docs/e2e/<feature>/*.png` (commit these)
- **Video** (`.webm`) and **trace** -> `apps/web/e2e/.artifacts/` (git-ignore the
  raw run output; keep only the video you want to attach)

Keep captures deterministic: clear `localStorage` first, use **Live** prices (or a
fixed horizon), and assert against the seeded data.

## 4. Attach to a PR

GitHub renders committed PNGs. Commit the screenshots on the branch, then embed
them in the PR body/comment by their raw URL:

```markdown
### Proof (dollar buy)
![preview](https://raw.githubusercontent.com/<owner>/<repo>/<branch>/apps/web/docs/e2e/dollar-buy/1-preview.png)
![dashboard](https://raw.githubusercontent.com/<owner>/<repo>/<branch>/apps/web/docs/e2e/dollar-buy/3-dashboard.png)
```

For the **recording**, either commit the `.webm` and link it, or drag it into the
PR comment on github.com (GitHub hosts the upload and inlines the player). Keep
files small; delete stale captures so the repo doesn't bloat.

> The `implement-issue` skill calls this automatically to attach visual proof to
> the PR it opens.
>
> The studio-wide `attach-screenshot` skill (invoked by `create-pr` for visible
> UI changes) hands off to THIS skill when it runs in this repo, since it already
> knows the routes, dev-server command, and deterministic-state rules. Keep the
> `docs/e2e/<feature>/*.png` output convention so those images embed cleanly in a PR.
