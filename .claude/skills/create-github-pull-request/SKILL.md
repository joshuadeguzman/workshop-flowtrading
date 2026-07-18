---
name: create-github-pull-request
description: >
  Open a pull request for a finished change, then automatically run an adversarial
  code review in a FRESH subagent (never the same context that wrote the code) and
  post the scored findings as PR comments. Use to standardize how every change
  lands in this repo. Prerequisite: your work is committed on a feature branch.
---

# Create a pull request (with a built-in, unbiased review)

This is how changes land in FlowTrading: open a PR, then let a **fresh reviewer**
grade it before a human looks. The reviewer must not be the session that wrote the
code - that context defends its own bugs. We spawn a **subagent** for it.

## 1. Preconditions

```bash
git branch --show-current          # must NOT be main
git status --short                 # your change is committed, tree clean
git remote get-url origin          # derive <owner>/<repo> for the MCP calls
```

- The **GitHub MCP server is connected** (`/mcp` shows `github` as `connected`;
  authenticate once via OAuth if not).
- On `main`? Create a branch first: `git checkout -b <type>/<short-name>`
  (e.g. `feat/sector-filter`, `fix/partial-sell`).
- Run the `verify-app` skill so the build/lint/typecheck are green before review.

## 2. Push the branch

The MCP `create_pull_request` tool opens a PR from a branch that already exists on
the remote, so push your local commits first (this is local git, not `gh`):

```bash
git push -u origin "$(git branch --show-current)"
```

## 3. Open the PR (studio convention)

Title: **`[type] Short description`** (`feat` / `fix` / `chore` / `docs` /
`refactor`). Body uses these sections; **no AI co-author or tool credit anywhere**:

```markdown
## What's in this PR
<What changed and why, in a few bullets. Link the issue: Closes #NN.>

## Test Plan
<How you verified it: `verify-app`, tests added, manual steps, the 4 screens.>

## Checklist
- [ ] Build, lint, and typecheck pass (`verify-app`)
- [ ] Follows `AGENTS.md` (data integrity, P&L a11y, money formatting, no live data)
- [ ] No em-dashes in user-facing copy
- [ ] Tests added/updated where it made sense
```

Call the GitHub MCP **`create_pull_request`** tool:

```
create_pull_request(
  owner: "<owner>", repo: "<repo>",
  base:  "main",
  head:  "<your branch>",
  title: "[feat] ...",
  body:  "<the What's in this PR / Test Plan / Checklist body above>"
)
```

Capture the PR number and URL it returns.

> **CLI fallback:** `gh pr create --base main --title "[feat] ..." --body-file pr.md`.

## 4. Review in a FRESH subagent (this is the point)

Do **not** review the diff in this session. Spawn the **`code-reviewer`**
subagent - it runs in its own clean context, so it has no attachment to the code.
Give it the PR:

> Run the `code-reviewer` subagent on PR #NN. It should follow the
> `adversarial-code-review` rubric: score each dimension, give a /100 and a
> verdict, and try to break the code.

For house-rule enforcement, also spawn the **`compliance-reviewer`** subagent
(data integrity, P&L accessibility, formatting, no live data, em-dash ban). Run
them as separate subagents so each is an independent, unbiased pass.

Collect their structured output.

## 5. Post the findings to the PR

Post the reviewer output as a PR review, mapping the verdict to the review event.
Call the GitHub MCP **`create_and_submit_pull_request_review`** tool:

```
create_and_submit_pull_request_review(
  owner: "<owner>", repo: "<repo>", pullNumber: <NN>,
  event: "APPROVE",           // APPROVE (>= 90) / APPROVE WITH NITS (70-89)
  // event: "REQUEST_CHANGES", // < 70, or any Critical finding
  body:  "<the scored review markdown>"
)
```

For findings tied to specific lines, build a review with inline comments instead:
`create_pending_pull_request_review` → one `add_comment_to_pending_review`
(`path`, `line`, `body`) per finding → `submit_pending_pull_request_review`
(`event`, summary `body`).

> **CLI fallback:** `gh pr review <NN> --approve --body-file review.md` (or
> `--request-changes`); inline via `gh api repos/{owner}/{repo}/pulls/{NN}/comments`.

## 6. Report back

Give the user the PR URL, the review verdict and score, and the Critical/Warning
counts. If the review requested changes, summarize what to fix.

## Guardrails

- Pushing, opening a PR, and posting review comments are **outward-facing**.
  Confirm the PR title/body with the user before `create_pull_request`, and note
  that the review will be posted publicly.
- The reviewer is advisory: it does not merge. A human merges after the review is
  addressed.
