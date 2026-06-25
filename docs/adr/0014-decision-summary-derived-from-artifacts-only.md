# ADR 0014: Decision summary derived exclusively from written artifacts

## Status

Accepted

## Context

The `add-decision-summary-to-spec-and-design-phases` change appends a print-only decision summary to the Completion section of `sai/commands/sai-1-spec.md` and `sai/commands/sai-2-design.md`. A summary line could in principle be sourced from either (a) the artifacts just written to disk (`proposal.md` / `specs/**` for the spec phase; `design.md` / `tasks.md` for the design phase) or (b) the conversation that produced them (discussed nuances, voiced-but-rejected alternatives).

The pipeline runs under Isolation Mode, where every command starts with no inherited context. A summary that folds in conversational facts is not auditable: a reviewer could no longer confirm that a printed line corresponds to a committed artifact, and drift between what was said and what was committed would be hidden inside a fluent narrative.

## Decision

Each summary line is valid only if it traces to content in the artifacts just written in this run. Conversation facts (nuances discussed, rejected alternatives voiced but not committed) are excluded. Every line must point back to a specific artifact section.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Conversation-aware summary | Friendlier; surfaces discussion highlights | Non-auditable; drifts under Isolation Mode; encourages the agent to invent a narrative |
| Full artifact dump | Maximally faithful | That is exactly the 200–800-line read the change is meant to eliminate |
| Artifact-only derivation (chosen) | Print equals disk; drift between discussion and commit becomes visible | Misses discussion-only nuances (acceptable — they are not committed) |

## Consequences

- Once agents are permitted to fold in conversational context, the "snapshot of disk" guarantee is gone; re-establishing it later requires re-instilling a norm agents have already internalized.
- A future reader may ask "why doesn't it surface the just-discussed nuance?" — answer: Isolation Mode + auditability; the print must equal disk so any drift becomes visible rather than hidden.
- The summary is a digest, not the whole surface; large changes rely on the `+N more — see <artifact>` signal line rather than conversational fill.

## Related

- [ADR 0015](./0015-decision-summary-precedes-completion-sentinel.md) — Decision summary precedes the completion sentinel
- `openspec/changes/add-decision-summary-to-spec-and-design-phases/design.md` — decision D1
