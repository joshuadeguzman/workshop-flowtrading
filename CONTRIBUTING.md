# Contributing to FlowTrading

Thanks for helping build FlowTrading. This repo **standardizes how changes
happen**: every change follows the same path, and the tedious parts (reviews,
checks) are handled by Claude Code skills and subagents that live in `.claude/`.
You can follow the same flow by hand if you don't use Claude Code.

> New here? Build the app first with the [Workshop guide](./WORKSHOP.md), and read
> the house rules in [AGENTS.md](./AGENTS.md) - they are the source of truth for
> how code in this repo should look.

---

## The standard change flow

```
issue  →  branch  →  build (follow AGENTS.md)  →  verify + tests  →  PR (auto review)  →  address  →  merge
```

1. **Start from an issue.** Describe the change before writing code. Use the
   `/create-github-issue` skill, or open one on GitHub with the same template
   (Summary / Context / Proposed change / Affected area / Acceptance criteria).
2. **Branch.** `git checkout -b <type>/<short-name>` (e.g. `feat/sector-filter`,
   `fix/partial-sell`). Never commit to `main` directly.
3. **Build.** Prompt Claude Code, or write it by hand. Either way, follow
   `AGENTS.md` (Claude Code reads it automatically). Reuse the skills below instead
   of re-deriving conventions.
4. **Verify and test.** Run `/verify-app` (build, lint, typecheck, smoke-test the
   four screens). Add tests with `/write-tests` where logic deserves a guard,
   starting with the portfolio math.
5. **Open a PR.** Use `/create-github-pull-request`. It opens the PR **and runs an
   adversarial code review in a fresh subagent** (see below), posting the scored
   findings as PR comments.
6. **Address the review, then merge.** A human merges after the review is handled.

---

## Reviews are automatic and unbiased

The reviewer must never be the same context that wrote the code - it defends its
own bugs. So reviews run in a **fresh subagent**:

- **`code-reviewer`** grades the diff against a scored rubric (Correctness, Next 16,
  house rules, simplicity, tests) for a `/100` and a verdict, and tries to break it.
- **`compliance-reviewer`** enforces the non-negotiables (data integrity, P&L
  accessibility, money formatting, no live data, the em-dash ban).

`/create-github-pull-request` spawns these automatically and posts their findings
to the PR. You can also run them any time: *"run the code-reviewer on my changes."*

---

## The tooling (`.claude/`)

**Skills** (`/<name>`):

| Skill | Use it for |
|---|---|
| `implement-issue` | A GitHub issue ID, taken end to end into a reviewed PR with visual proof |
| `create-github-issue` | Filing a scoped, templated issue |
| `create-github-pull-request` | Opening a PR + auto fresh-context review + posted findings |
| `adversarial-code-review` | The scored review rubric (also usable standalone) |
| `write-tests` | Unit (portfolio math), component, and Playwright e2e tests |
| `e2e-capture` | Playwright flow + screenshots/recording to attach to a PR |
| `verify-app` | Build + lint + typecheck + smoke-test the 4 screens |
| `new-screen` | Scaffolding a new route that follows the conventions |
| `next-best-practices` | Next 16 gotchas (async `params`, hydration) |

> Shortcut: **`implement-issue`** runs the whole flow (steps 2-6 below) for a
> single issue ID, including the Playwright capture and the reviewed PR.

**Subagents:** `code-reviewer`, `compliance-reviewer`, `test-writer`, `test-runner`.

---

## Conventions

- **PR title:** `[type] Short description` (`feat` / `fix` / `chore` / `docs` /
  `refactor`). **Body:** What's in this PR / Test Plan / Checklist.
- **No AI attribution** in commits or PRs (no co-author trailer, no tool credit).
  Commits are authored by the engineer alone.
- **Code standards** live in [AGENTS.md](./AGENTS.md): data is ground truth, money
  goes through `lib/format.ts`, P&L carries sign + arrow + color, dark theme is
  locked, motion honors reduced-motion, and **no em-dashes** in user-facing copy.
- Keep changes scoped to one screen or one concern where you can.

---

## Local setup

```bash
npm install       # from the repo root
npm run dev       # http://localhost:3000
```

Full details in the [README](./README.md) and [WORKSHOP.md](./WORKSHOP.md).

---

We'll open this repo up to contributors after the workshop. Following this flow now
keeps every change reviewed, tested, and consistent, so that's a smooth handoff.
