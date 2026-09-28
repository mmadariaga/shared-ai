# Direct Build Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/policies/remember.md
Fetch @sai/policies/repository-artifact-scope.md and use it.

## Invocation Envelope

The worker receives exactly one opaque string: `arguments_value`. Under
strict-zero two-phase startup the initial dispatch carries only the ready
prompt plus base instructions with no task content; `arguments_value` arrives
only in the post-ready same-worker continuation after `event: ready`. Its first
line is the marker `--direct-build`; everything after the first newline is the
complete crystallized `Ready to Propose` block emitted by explore. Strip the
marker line and treat that block as your sole substantive input: no design or
tasks artifacts exist, no conversation context is forwarded, and none may be
inferred from repository discovery beyond what implementing the block
requires. Binding metadata remains outside the worker request.

## Block-driven direct implementation

Implement the change directly from the block. Work from **Capabilities in
scope**, **Key constraints**, **Implementation Details** (`I1`…`In`), and
**Edge Cases** (`E1`…`En`); treat **Research Leads** as non-authoritative
starting points only, and read **Request Additional Notes**, when present, as
non-authoritative context in the same way — it adds no scope and no
requirement. Follow the project's existing code conventions,
glossary terms where `GLOSSARY.md` exists, and format rules. Keep the diff
minimal and reviewable.

**Slice-scoped scope rule**: when the block comes from a sliced
crystallization set, `**Capabilities in scope**` bounds this run. Every
per-slice block carries the whole-idea `**Implementation Details**` list,
deliberately unattributed per slice, so implement an item `I1`…`In` only when
a capability in this block's `**Capabilities in scope**` (or an Edge Case
attributed to this slice) requires its behavior. Items that serve a later
slice's capabilities stay wholly outside this run's diff: no stub, no
reference.

Write any artifact the crystallized change requires, within the
repository-artifact scope and its protected update protocols, under these role
restrictions:

- never create planning artifacts (`design.md`, `tasks.md`,
  `implementation.md`);
- never run a mutating git command — no `git add`, `git commit`, `git push`,
  no branch, tag, stash, or reset operations;
- never dispatch subagents.

## Functional fix loop

Explore reviews the resulting diff against the block's Capabilities and Edge
Cases and continues THIS same worker with findings when correction is needed.
A continuation payload is an ordered finding list (or a verification note);
apply exactly the listed corrections within the block's scope, return the
closed lifecycle result again, and add every touched path to
`changed_files`. Do not re-plan, expand scope, or "improve" beyond findings.

## Lifecycle

Emit no progress events. Every stretch opens with `event: ready` as its first
nonterminal return before any expensive work; the block arrives only in the
post-ready same-worker continuation. Every run closes with exactly
one terminal lifecycle status — `completed`, `needs_input`, `failed`, or
`cancelled` — in the closed worker-core shapes, each carrying a concrete English `summary`, and an ordered
duplicate-free `changed_files` union of every path created or modified across
all rounds of this worker instance. Worker payloads carry no time field. Return `failed` with a concrete failure
class when the block cannot be implemented as written; never silently
substitute a different feature.
