---
name: attach-screenshot
description: Capture screenshots (or a short recording) of the current change and turn them into PR-ready, embeddable markdown. Invoke when opening a PR with visible UI changes (the create-pr skill calls this), or when the user says "attach a screenshot", "add screenshots to the PR", "show before/after", or "capture the change".
---

# Attach screenshots to a change / PR (FlowTrading)

Produce visual proof of a change and hand back markdown that embeds it in a PR.
This is the FlowTrading copy of the studio-wide `attach-screenshot` skill, wired
to this repo's tools and conventions.

The output is always the same: committed image files on the branch plus a
**markdown block** the caller drops under the PR's "Please attach screenshots or
videos demonstrating the changes:" line.

## 1. Decide whether screenshots are even needed

Screenshots are expected for **visible UI changes** to the four screens
(portfolio, screener, stock detail, trade). Skip and return `N/A — <reason>` when
the diff is `lib/`-math, `data/`, config, or docs/test-only with no rendered
surface. Look at what changed first:

```bash
git diff --stat main...HEAD
```

## 2. Capture with the `e2e-capture` skill (preferred)

In this repo, **do not hand-roll a capture** unless you have to. Invoke the
**`e2e-capture`** skill: it already knows the routes, starts `npx next dev`, and
enforces the determinism rules (clear `localStorage`, trade at the **Live**
seeded price so NVDA is $207.40). Point it at the flow your change touches and
let it write named PNGs.

Determinism is non-negotiable here (AGENTS.md): reset state first and assert
against the seeded `data/stocks.ts` values, so re-running yields identical images
and reviewers see the real numbers, not a random horizon.

## 3. Fallback: Claude-in-Chrome against a running dev server

If a full Playwright run is overkill (a single one-off shot), start the app and
use the `claude-in-chrome` browser tools to open the route, drive the change, and
capture the viewport. Save the images into the committable path in step 4.

Start a persistent server the way AGENTS.md prescribes (turbo dev exits in a
no-TTY shell):

```bash
cd apps/web && npx next dev
```

## 4. Save somewhere committable, then commit

GitHub only renders images it can reach, so screenshots must be **committed and
pushed on the branch**. A local or `/tmp` path will not embed.

- Path convention (matches `e2e-capture`): **`apps/web/docs/e2e/<feature>/<n>-<step>.png`**.
- Do **not** commit raw Playwright output. `apps/web/.gitignore` already ignores
  `e2e/.artifacts/`, `test-results/`, and `playwright-report/`. Keep only the
  curated PNGs (and a `.webm` only if you deliberately want to attach one).

```bash
git add apps/web/docs/e2e/<feature>/*.png
git commit -m "Add PR screenshots for <feature>"
git push
```

## 5. Before/after for redesigns

When the change alters an existing screen, capture `main` first, then the branch,
so the diff is visible:

```bash
git switch main        # (git stash first if the tree is dirty)
# capture -> apps/web/docs/e2e/<feature>/before-*.png
git switch -           # back to the branch (git stash pop if used)
# capture -> apps/web/docs/e2e/<feature>/after-*.png
```

## 6. Emit the embed markdown (this is the return value)

Resolve owner/repo/branch instead of hardcoding, then return the block the PR
body needs:

```bash
gh repo view --json nameWithOwner -q .nameWithOwner   # <owner>/<repo>
git branch --show-current                              # <branch>
```

```markdown
- **<Screen / step name>**
  ![<alt>](https://raw.githubusercontent.com/<owner>/<repo>/<branch>/apps/web/docs/e2e/<feature>/2-receipt.png)
```

Before/after reads best as a table:

```markdown
| Before | After |
|---|---|
| ![before](https://raw.githubusercontent.com/<owner>/<repo>/<branch>/apps/web/docs/e2e/<feature>/before-dashboard.png) | ![after](https://raw.githubusercontent.com/<owner>/<repo>/<branch>/apps/web/docs/e2e/<feature>/after-dashboard.png) |
```

`create-pr` splices this under the screenshots line. A direct invocation prints it
or edits an existing PR: `gh pr edit --body "$(cat <<'EOF' ... EOF)"`. For a
**recording**, GitHub does not render a raw `.webm` by URL: commit and link it, or
drag it into the PR comment on github.com.

## Notes

- **Honesty:** only attach shots of states you actually produced.
- **No em dashes** in captions or PR copy (studio writing rule).
- The generic, cross-project version of this skill lives in the studio global
  skills; this repo copy specializes it to FlowTrading and `e2e-capture`.
```
