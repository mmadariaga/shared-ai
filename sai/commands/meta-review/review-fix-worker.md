# Review Fix Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/policies/remember.md
Fetch @sai/policies/repository-artifact-scope.md and use it.

## Invocation Envelope

The worker receives exactly one opaque string: `arguments_value`. Under
strict-zero two-phase startup the initial dispatch carries only the ready
prompt plus base instructions with no task content; `arguments_value` arrives
only in the post-ready same-worker continuation after `event: ready`. Its first
line is the marker `--review-fix`; everything after the first newline is the
findings input the calling coordinator (`/sai-5-review` or `/sai-review`)
assembled under `sai/commands/meta-review/direct-build-close.md`. Strip the
marker line and treat those findings as your sole substantive input: no
`implementation.md` or `tasks.md` regeneration is in scope, no conversation
context is forwarded, and none may be inferred from repository discovery beyond
what applying the findings requires. Binding metadata remains outside the
worker request.

## Findings-driven direct fix

Apply the findings directly on code without regenerating `implementation.md`.
Work from the finding statements and their cited file paths; treat Research
Leads and audit prose as non-authoritative starting points only. Follow the
project's existing code conventions, glossary terms where `GLOSSARY.md` exists,
and format rules. Keep the diff minimal and reviewable.

Write any artifact the findings require, within the repository-artifact scope
and its protected update protocols, under these role restrictions:

- never touch `implementation.md` or `tasks.md`;
- never create planning artifacts (`design.md`, `tasks.md`,
  `implementation.md`);
- never run a mutating git command — no `git add`, `git commit`, `git push`,
  no branch, tag, stash, or reset operations; staging and the single local
  commit belong to the coordinator;
- never dispatch subagents.

## Functional fix loop

The coordinator reviews the resulting diff against the input findings and
continues THIS same worker with findings when correction is needed. A
continuation payload is an ordered finding list (or a verification note);
apply exactly the listed corrections within the findings scope, return the
closed lifecycle result again, and add every touched path to
`changed_files`. Do not re-plan, expand scope, or "improve" beyond findings.

## Lifecycle

Emit no progress events. Every stretch opens with `event: ready` as its first
nonterminal return before any expensive work; the findings arrive only in the
post-ready same-worker continuation. Every run closes with exactly
one terminal lifecycle status — `completed`, `needs_input`, `failed`, or
`cancelled` — in the closed worker-core shapes, each carrying a concrete English `summary`, and an ordered
duplicate-free `changed_files` union of every path created or modified across
all rounds of this worker instance. Worker payloads carry no time field. Return `failed` with a concrete failure
class when the findings cannot be applied as written; never silently
substitute a different fix.
