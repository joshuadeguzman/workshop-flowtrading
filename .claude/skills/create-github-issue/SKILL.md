---
name: create-github-issue
description: >
  Open a well-structured GitHub issue for FlowTrading via the gh CLI, using a
  standard template so every change starts from a clear, scoped request. Use when
  you spot a bug, want to propose a feature, or are turning a rough idea into
  trackable work. This is the first step of the standardized change flow.
---

# Create a GitHub issue

Every change should start from an issue, so work is visible and scoped before any
code is written. This skill drafts a consistent issue and files it with `gh`.

## Preconditions

```bash
gh auth status          # must be authenticated
gh repo view --json nameWithOwner   # confirm you're on the right repo
```

## 1. Draft the issue (standard template)

Fill this out. Keep it concrete and scoped to one change.

```markdown
## Summary
<One sentence: what should change and why.>

## Context / problem
<What's wrong or missing today. Link a screen or file. If it's a bug, give
repro steps and what you expected vs. what happened.>

## Proposed change
<What you'd do. Keep it to one screen or one concern where possible.>

## Affected area
<Which of the four screens (Dashboard / Stock detail / Buy-Sell / Screener) and
which files (e.g. `lib/portfolio.ts`, `components/finance/*`).>

## Acceptance criteria
- [ ] <A checkable outcome>
- [ ] <Another>
- [ ] Follows the house rules in `AGENTS.md` (data integrity, P&L accessibility,
      money formatting, no live data)

## Notes
<Constraints, links, anything a reviewer should know.>
```

## 2. Pick a type label

`bug`, `feature`, `chore`, or `docs`. Create the label first if it doesn't exist
(`gh label create <name>` - optional).

## 3. File it

Write the body to a file, then:

```bash
gh issue create \
  --title "<concise imperative title>" \
  --body-file issue.md \
  --label "feature"
```

`gh issue create` prints the new issue URL - hand it back to the user.

## Guardrail

Opening an issue posts publicly to the repo. **Draft it, show the user the title
and body, and confirm before running `gh issue create`.** Don't invent details
you're unsure of - leave a `TODO` for the human instead.
