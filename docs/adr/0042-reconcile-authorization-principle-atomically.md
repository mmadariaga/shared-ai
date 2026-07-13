# ADR 0042: Reconcile the "ask every time" authorization principle atomically at the principle layer

## Status

Accepted

## Context

The CRITICAL "ask every time / No implicit authorization" block in `apply.md:220-223` and the shared hard rules in `commit-rules.md:110-111` state absolute per-invocation authorization. Adding a session-scoped skip creates a standing contradiction unless the principle itself is amended.

## Decision

Amend the principle block and the shared hard rules in the same commit as the gate change, adding an explicit opt-in carve-out. The carve-out enumerates that it covers `git add` + `git commit` only and preserves per-operation approval for `push`, `--force`, branch create/switch, rebase, merge, tag, and `gh pr`. The GREEN-conflict STOP and apply Human Verification gate remain unaffected.

## Alternatives Considered

- **Gate-prose-only edit, leave principle untouched.** Rejected: the spec scenario "Ask-every-time principle amended, not silently overridden" forbids leaving the principle in contradiction. A partial edit yields a non-buildable (self-contradicting) instruction snapshot.
- **Atomic principle reconciliation** (chosen): edits `apply.md`, `commit.md`, and `commit-rules.md` together so the gate, the principle, and the hard rules are mutually consistent.

## Consequences

- The "ask every time" default is no longer absolute; it is explicitly scoped. Future changes that introduce similar session grants must follow the same pattern of atomic principle amendment.
- The CRITICAL block becomes slightly longer to accommodate the carve-out.
