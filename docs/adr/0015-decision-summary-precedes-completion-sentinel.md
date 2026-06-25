# ADR 0015: Decision summary precedes the completion sentinel

## Status

Accepted

## Context

The `add-decision-summary-to-spec-and-design-phases` change prints a decision summary at the end of `sai/commands/sai-1-spec.md` and `sai/commands/sai-2-design.md`. Both command bodies already terminate with a stable sentinel line: the spec phase prints a mandatory stop ("Spec proposal done in openspec/changes/{name}/..."); the design phase prints an (a)/(b) handoff prompt. Users and automation may key off these sentinels to detect completion.

The summary could be placed either before or after the existing terminal line.

## Decision

The summary block prints immediately before the existing terminal content. The terminal line (mandatory stop / handoff prompt) remains the LAST printed content in both phases and in both design Completion paths (the (a) stop and the (b) continue). The summary is framed as review material preceding the next-step instruction.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Append at the very end | Simpler off-by-one | Demotes the sentinel; "next-step" reads as an afterthought; breaks any scanner that matches the last line |
| Print summary before artifact-write confirmation | — | Rejected: the summary must reflect artifacts just written, so it logically follows the writes, not precedes them |
| Summary before terminal line (chosen) | Preserves sentinel-based detection; matches the print-then-instruct precedent | Slightly more complex ordering logic in the Completion section |

## Consequences

- Any user/automation that keys off the terminal sentinel ("done", "Run `/sai-3-implement …`") continues to work; removing the sentinel-last rule later would re-break that detection.
- Mirrors an established repo pattern, not a new convention: `sai/instructions/explore.md` prints a "Ready to Propose" block then instructs the user to open a new chat (print-then-instruct), and `openspec/specs/apply-completion-clarity/spec.md` codifies "MUST NOT print the completion message — it must present the verification gates first" (subordinate content precedes the done sentinel).
- The summary appears in both design Completion paths (the (a) stop and the (b) continue), keeping the review surface consistent regardless of which path the user takes.

## Related

- [ADR 0014](./0014-decision-summary-derived-from-artifacts-only.md) — Decision summary derived exclusively from written artifacts
- `openspec/specs/apply-completion-clarity/spec.md` — subordinate content precedes the done sentinel
- `openspec/changes/add-decision-summary-to-spec-and-design-phases/design.md` — decision D2
