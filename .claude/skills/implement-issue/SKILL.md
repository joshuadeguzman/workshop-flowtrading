---
name: implement-issue
description: >
  Take a GitHub issue from ID to pull request, end to end: read the issue, branch,
  implement it following the house rules, verify, prove it in a real browser with
  Playwright (screenshots + recording), then open a PR with those artifacts and a
  fresh-subagent review. Use to work a tracked issue as a single standardized flow.
---

# Implement an issue, end to end

Given a GitHub issue ID, deliver it as a reviewed PR with visual proof. This
orchestrates the other skills and subagents; the golden rule holds throughout:
**the code is written in this session, but it is reviewed by a fresh subagent** so
the review is honest.

## 1. Read the issue (it is the spec)

Make sure the **GitHub MCP server is connected** (`/mcp` shows `github`), derive
`<owner>/<repo>` from `git remote get-url origin`, then read the issue with the
GitHub MCP **`get_issue`** tool:

```
get_issue(owner: "<owner>", repo: "<repo>", issue_number: <ID>)
```

> **CLI fallback:** `gh issue view <ID> --json number,title,body,labels`.

Treat the **Acceptance criteria** as the contract. If anything is ambiguous, ask
the user before writing code, or state your interpretation in the PR. Don't invent
scope the issue didn't ask for.

## 2. Branch

```bash
git checkout -b <type>/issue-<ID>-<short-slug>   # e.g. feat/issue-1-trade-history
```

## 3. Implement (follow the house rules)

Build the smallest change that satisfies the acceptance criteria, following
`AGENTS.md`. Reuse what exists:
- New screen? Use the **`new-screen`** skill (client boundaries, `useAccount` /
  `useSimulation` / `useWatchlist`, money via `lib/format`, `<Pnl>`, hand-rolled
  charts, motion gated on reduced-motion).
- Next 16 friction? **`next-best-practices`**.
- Never edit `data/stocks.ts` values; keep P&L accessible; no live data.

## 4. Verify

Run **`verify-app`** (build + lint + typecheck + smoke the 4 screens). Add unit
tests for any new logic via **`write-tests`** (or spawn the `test-writer`
subagent), especially anything touching `lib/portfolio.ts`.

## 5. Prove it in the browser + capture

Run **`e2e-capture`**: a Playwright spec that walks the new behavior, screenshots
the key beats into `apps/web/docs/e2e/issue-<ID>/`, and records a video. This is
the visual proof for the PR.

## 6. Commit and open the PR (with review)

Commit the change and the screenshots, then run **`create-github-pull-request`**.
It:
- opens the PR (`[type] ...` title; What's in this PR / Test Plan / Checklist body;
  `Closes #<ID>`),
- embeds the `e2e-capture` screenshots (raw URLs) and links the recording under a
  **Proof** section,
- spawns the **`code-reviewer`** and **`compliance-reviewer`** subagents in fresh
  context and posts their scored findings to the PR.

## 7. Report

Give the user: the PR URL, the review verdict + score, the Critical/Warning counts,
and a one-line note on any acceptance criterion still open. If the review requested
changes, loop back to step 3 for the fixes (a fresh review runs again).

## Guardrails

- Pushing, opening the PR, and posting review comments are outward-facing. Confirm
  the PR title/body before opening the PR (`create_pull_request`).
- Keep implementation and review separate: do not let this session declare its own
  work correct. The subagent review is the gate.
