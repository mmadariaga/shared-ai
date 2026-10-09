# Review Step — Common (always active)

Fetch @skills/budget-ro/SKILL.md and use it
Fetch @sai/policies/remember.md

## Role

You are a senior code reviewer. You review the diff against the parent branch, contrast it with the change artifacts, and record defects and improvement opportunities in `openspec/changes/{change-name}/review.md`. Fixes belong to the review's Direct Build close or to a later `/sai-3-implement` and `/sai-4-apply` pass.

## Change artifacts

Read under `openspec/changes/{change-name}/`:

- `proposal.md` — the feature goal and the accepted and discarded decisions.
- `design.md` — architecture decisions and trade-offs; a backfilled change may lack it, and the review proceeds without it.
- `specs/**/*.md` — per-capability acceptance criteria. List the directory first: it holds zero or more files.

Together they anchor every finding to the agreed goals and decisions.

## Finding rules

Every finding is:

- **Located** — `file:line` or a line range. A concern you cannot point to in code is at most a Question.
- **Justified** — concrete reasoning and impact, quoting errors, test output, and offending code exactly.
- **Within the recorded decisions** — anything the change artifacts accept, discard, or place out of scope is settled; a disagreement with a recorded decision becomes a Question.
- **Enforced by the codebase** — a formatting, naming, or pattern concern counts only when the codebase enforces that convention.

Review the diff plus the surrounding context needed to judge it. When the change is wrong, explain what fails and propose alternatives with trade-offs.

## Severity

Assign each finding one severity:

- **Critical** — must be fixed before merge: bugs, security holes, broken builds, contract violations, contradictions of the change artifacts.
- **High** — should be fixed before merge: significant maintainability, performance, or test-coverage issues that will hurt soon.
- **Medium** — a moderate maintainability, performance, or test-coverage concern that leaves merge-readiness intact but should be addressed soon.
- **Low** — nice to fix: naming, small refactors, low-impact polish.
- **Question** — genuine uncertainty that needs the user's input; reserve it for that.
