# ADR 0152a: Overview generation contract is transported by Fetch on dispatch

<!-- adr-index: refs 0146b -->

## Status

Accepted

## Context

The design worker's overview-generation dispatch is the sole transport path for the shared overview-generation contract (`sai/commands/design/change-overview.md`) to reach the budget-routed generation subagent. No live card emitted a Fetch for that contract, so the subagent never received it. The worker improvised a prompt and filled gaps from the workflow schema's superseded `instruction:` text, producing overviews that mirrored source-document headings instead of the nine required sections.

The shared contract at `sai/commands/design/change-overview.md` is already correct and complete — it defines the nine required sections, the eight forbidden legacy sections, the five-field generator envelope, the closed `failure_kind` vocabulary, the generator-vs-parent authoring split, and the pre-write validation rules. Everything living only in the un-fetched contract was lost on every run.

The command-owned path for the contract was established by [ADR 0146b](./0146b-command-owned-files-live-in-their-consuming-command-directory.md), which moved the three command-owned files — including `change-overview.md` — out of the retired `sai/` root into their consuming command directories.

## Decision

The design worker's overview-generation dispatch instructs the subagent to Fetch `@sai/commands/design/change-overview.md` and follow it exactly. The subagent loads the contract itself; the worker does not fetch the contract and compose a paraphrased generation prompt. The dispatch prompt carries exactly three elements: (1) the resolved change name, (2) the current invocation's `overview_language` value, and (3) the Fetch directive for `@sai/commands/design/change-overview.md` with an instruction to follow it exactly. The prompt does not enumerate nine sections, forbidden sections, content requirements, fidelity rules, pre-write validation rules, or any other normative body of the shared contract.

The minimal prompt is a consequence of the transport mechanism: since the subagent loads the contract itself, the worker only needs to identify the change, set the language, and point to the contract. First materialization and regeneration use the same transport and the same minimal prompt shape; there is no regeneration-specific prompt variant.

## Alternatives Considered

- **Worker fetches the contract and composes the dispatch prompt** — retains the paraphrase step with better source material; same failure mode (worker-authored paraphrase drifts from the contract), longer fuse. Rejected.
- **Carry contract norms as a fourth prompt element** — violates the minimal-prompt requirement and re-introduces paraphrase drift under a different name. Rejected.

## Consequences

- The subagent loads the shared contract itself; the worker never paraphrases normative generation content into the dispatch prompt.
- Project-local Fetch resolution (project-local before global) can silently prefer a stale local `change-overview.md`; detecting or repairing stale local overrides is an accepted non-goal of this change.
- `validation: passed` remains self-attested by the generator; worker-side structural verification before committing `overview.state: current` remains an explicit deferred item.

## Provenance

codebase-forced — the shared contract already exists at the command-owned path (established by ADR 0146b) and the house pattern (from `sai/commands/explore/body.md` and both worker binding templates) is contract-by-Fetch dispatch. No alternative transport mechanism exists in the repository.
