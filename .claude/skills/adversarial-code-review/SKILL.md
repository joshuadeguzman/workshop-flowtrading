---
name: adversarial-code-review
description: >
  Review a diff or pull request adversarially against the FlowTrading spec,
  produce a scored rubric and a verdict, and optionally post it as a GitHub PR
  comment. Use before merging a change, or when you want an honest second opinion.
  Best run in a FRESH session so the reviewer isn't the same context that wrote
  the code.
---

# Adversarial code review

The chat that wrote the code is the worst judge of it - it defends its own bugs.
This skill runs a **critic** pass: assume the diff is wrong until proven right,
score it against a rubric, and (optionally) post the result to GitHub.

> 💡 For real independence, run this in a **new session** from the one that wrote
> the code, or via the `code-reviewer` subagent (fresh context by design).

## 1. Gather the change

```bash
git status --short
git diff                      # unstaged + staged working changes
```

For a PR, read it through the **GitHub MCP server** (`/mcp` shows `github`
connected; derive `<owner>/<repo>` from `git remote get-url origin`):

```
get_pull_request(owner: "<owner>", repo: "<repo>", pullNumber: <N>)        // title, body, head
get_pull_request_diff(owner: "<owner>", repo: "<repo>", pullNumber: <N>)   // the diff
```

> **CLI fallback:** `gh pr view <N> --json title,body,headRefName` and `gh pr diff <N>`.

Read the diff **and** enough surrounding code to judge it. If a PR body or issue
states the intended behavior, treat that as the spec. If there's no written spec,
infer it from the change and say so.

## 2. Score against the rubric

Rate each dimension **0-5** (5 = flawless, 3 = works with issues, 0 = broken or
absent). Multiply by the weight, sum to a **/100**.

| Dimension | Weight | What earns a low score |
|---|---:|---|
| **Correctness** | 30 | Wrong output, unhandled edge cases, off-by-one, a math error in `lib/portfolio.ts` (e.g. partial sell changing avg cost, or summing realized + unrealized) |
| **Next 16 / React** | 20 | `params` not awaited (server) or awaited (client), hydration risk from `localStorage`/`Date`/random on first render, `'use client'` too high in the tree, fighting the React Compiler |
| **House-rules compliance** | 20 | Edits to `data/stocks.ts` values, P&L without sign+arrow, hand-rolled money formatting, `-$0.00`, brand/green/red misused, motion without reduced-motion, an em-dash in copy (see `AGENTS.md`) |
| **Simplicity & clarity** | 15 | Dead code, needless abstraction, unclear naming, missing "why" comments in the math |
| **Tests & verifiability** | 15 | No test for new logic that could be unit-tested, no manual verify steps, build/lint not run |

**Verdict** from the total:

- **90-100 → APPROVE** (ship it)
- **70-89 → APPROVE WITH NITS** (safe to merge, address nits)
- **50-69 → REQUEST CHANGES** (real issues, don't merge yet)
- **< 50 → BLOCK** (broken or unsafe)

Any **Critical** finding (data corruption, a portfolio-math error, a hydration
crash, a security issue) caps the verdict at **REQUEST CHANGES** regardless of score.

## 3. Write the findings

Group by severity, most severe first. For each: `file:line`, one sentence on the
defect, the concrete failure it causes, and the fix. **Try to break the code** -
name the input that misbehaves. Don't invent issues to look thorough; if it's
clean, say so.

## 4. Output format

```markdown
## 🔎 Adversarial review - <PR title or branch>

**Verdict: REQUEST CHANGES - 64/100**

| Dimension | Score | Notes |
|---|---|---|
| Correctness | 3/5 | partial sell re-averages cost (see below) |
| Next 16 / React | 4/5 | ok |
| House rules | 3/5 | P&L missing arrow in one place |
| Simplicity | 4/5 | ok |
| Tests | 2/5 | no unit test for the sell path |

### 🔴 Critical
- `lib/portfolio.ts:88` - selling recomputes `avgCost`; a partial sell must keep
  it constant. Buy 10 @ $200, sell 4 → avg should stay $200, not shift. Fix: only
  reduce `shares` and `totalCost` at the existing avg.

### 🟡 Warnings
- `components/finance/holding-row.tsx:24` - colored P&L with no ▲/▼ arrow; fails
  the greyscale-readable rule. Use `<Pnl>`.

### 🟢 Nits
- ...
```

## 5. Post to GitHub (optional)

Only when asked, and only after the review is written. Post the markdown from
step 4 through the **GitHub MCP server**.

For a plain comment on the PR conversation, call **`add_issue_comment`** (a PR is
an issue, so `issue_number` is the PR number):

```
add_issue_comment(owner: "<owner>", repo: "<repo>", issue_number: <N>, body: "<review markdown>")
```

For a formal review with an explicit state, call
**`create_and_submit_pull_request_review`** with the matching `event`:

```
create_and_submit_pull_request_review(
  owner: "<owner>", repo: "<repo>", pullNumber: <N>,
  event: "COMMENT" | "REQUEST_CHANGES" | "APPROVE",
  body:  "<review markdown>"
)
```

To attach findings to specific lines, build a pending review instead:
`create_pending_pull_request_review` → `add_comment_to_pending_review`
(`path`, `line`, `body`) per finding → `submit_pending_pull_request_review`.

> **CLI fallback:** `gh pr comment <N> --body-file review.md`, or
> `gh pr review <N> --comment | --request-changes | --approve --body-file review.md`;
> inline via `gh api repos/{owner}/{repo}/pulls/{N}/comments`.

> ⚠️ Posting to GitHub is outward-facing. Confirm the PR number and that the user
> wants it posted before calling `add_issue_comment` / `create_and_submit_pull_request_review`.
