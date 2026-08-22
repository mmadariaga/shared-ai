# ADR 0158c: Delete the worker-owned planning-artifact review loop

<!-- adr-index: supersedes 0139a; refs ddr:0133b; refs ddr:0134a -->

## Status

Accepted

## Context

The spec-proposal and design workers each owned a second artifact-review path: after writing phase artifacts they could dispatch an isolated cold reviewer, run capped automatic passes, count completed passes and total attempts, and treat a worker-owned `High=0` pass as `review` progress evidence. Explore already owns the manual post-crystallization Review Engine and the supervised in-session Review Engine rounds. Under supervision the workers suppressed their automatic loop when `--supervised` was present, which left two review models and two places encoding marker grammar and convergence rules.

This is change `remove-cold-artifact-reviewer`, Decision D1.

## Decision

Remove the entire worker-owned automatic planning-artifact review loop (dispatch, isolation input set, completed-pass/total-attempt counters, retry-on-invalid-output, and user-requested worker passes) from both the spec and design worker contracts. Do not retain a `--supervised`-gated dead path. Independent invocations and supervised invocations share the same rule: workers never create a reviewer. Explore is the sole surface that forms planning-artifact findings; workers remain artifact writers and consumers of externally supplied findings blocks.

## Alternatives Considered

- **Keep the loop and only suppress under supervision** (status quo after the prior change) — rejected; duplicate counters, evidence sources, and marker semantics remain.
- **Permanently disable via flag but leave the code** — rejected; a suppressed loop is still a second model.
- **Delete the loop entirely** (chosen) — single-sources review in Explore.

## Consequences

- Spec and design worker contracts lose reviewer dispatch, isolation rules, and automatic-loop counters.
- ADR 0139a's worker-dispatched fresh-read-only reviewer path is superseded; worker-owned artifact edits for *forwarded* findings remain via the feedback gate.
- DDR 0134a's two worker-owned counters disappear with the loop (domain evidence rules live under DDR 0151c / DDR 0133b).
- Tests that pin worker-owned loop, caps, and suppression must retarget to external-findings consumption.

## Provenance

User — `openspec/changes/remove-cold-artifact-reviewer/design.md`, Decision D1.
