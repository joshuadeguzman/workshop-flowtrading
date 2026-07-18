---
name: create-github-issue
description: >
  Open a well-structured GitHub issue for FlowTrading via the GitHub MCP server,
  using a standard template so every change starts from a clear, scoped request.
  Use when you spot a bug, want to propose a feature, or are turning a rough idea
  into trackable work. This is the first step of the standardized change flow.
---

# Create a GitHub issue

Every change should start from an issue, so work is visible and scoped before any
code is written. This skill drafts a consistent issue and files it through the
**GitHub MCP server** shipped in this repo's `.mcp.json`.

## Preconditions

- The **GitHub MCP server is connected.** Run `/mcp` in Claude Code; `github`
  should show `connected` (authenticate once via OAuth if not).
- Know the target repo. Derive `<owner>/<repo>` from the remote:

```bash
git remote get-url origin   # e.g. github.com/<owner>/<repo>.git
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

`bug`, `feature`, `chore`, or `docs`. The label must already exist on the repo
(create it once in the GitHub UI under **Issues → Labels**). If it doesn't exist
yet, drop it from the call rather than failing the create.

## 3. File it

Call the GitHub MCP **`create_issue`** tool with the drafted content:

```
create_issue(
  owner:  "<owner>",
  repo:   "<repo>",
  title:  "<concise imperative title>",
  body:   "<the filled-in template from step 1>",
  labels: ["feature"]        // omit if the label doesn't exist yet
)
```

It returns the new issue number and URL - hand that back to the user.

> **CLI fallback** (if you're not using MCP): write the body to `issue.md`, then
> `gh issue create --title "..." --body-file issue.md --label "feature"`.

## Guardrail

Opening an issue posts publicly to the repo. **Draft it, show the user the title
and body, and confirm before calling `create_issue`.** Don't invent details
you're unsure of - leave a `TODO` for the human instead.
