# ADR 0160: Interactive artifact feedback gate gains a non-option review-loop note only

<!-- adr-index: refs 0028; refs ddr:0150; refs adr:0158 -->

## Status

Accepted

## Context

With the worker-owned cold reviewer removed, standalone `/sai-1-spec` and `/sai-2-design` runs need a discoverable path to obtain an Explore findings block for paste-through the existing artifact feedback gate. The gate already has a closed two-option interactive presentation and a supervised picker-free mode.

This is change `remove-cold-artifact-reviewer`, Decision D4.

## Decision

In interactive mode, insert a localized informational note immediately before the existing canonical feedback question. The note explains that `sai-explore`'s literal `review-loop` token produces a pasteable findings block. Keep exactly two options and the existing question/description strings. Supervised mode stays picker-free and omits the note. The note is not a third option, feedback input, approval, or progress event.

## Alternatives Considered

- **Add a third picker option** — rejected by the artifact-feedback-gate delta and picker capacity discipline.
- **Change the canonical question text** — rejected; question/description strings must stay byte-stable after `{artifacts}` replacement.
- **Auto-invoke Explore from the gate** — rejected; invents a new control and breaks isolation boundaries.
- **Non-option note only** (chosen) — surfaces the external review path without new controls.

## Consequences

- `sai/policies/artifact-feedback-gate.md` carries the note presentation rule; identifiers `sai-explore` and `review-loop` stay verbatim English.
- Tests must pin note placement, verbatim tokens, non-option status, and supervised omission.

## Provenance

User — `openspec/changes/remove-cold-artifact-reviewer/design.md`, Decision D4.
