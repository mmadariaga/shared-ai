# ADR 0190: Review keeps domain and resilience analysis without mutation execution

<!-- adr-index: supersedes 0012; amends 0107b; refs 0013, 0162b, 0189, ddr:0105 -->

## Status

Accepted

## Context

Mutation analysis adds engine probing and unavailable-result boilerplate to review. The observed mutation findings duplicated Testing findings. The report also repeats findings and recommendations in separate presentation sections. Resilience analysis, however, owns useful fault-tolerance findings and must remain.

ADR 0013 is already listed as superseded by 0107b, and ADR 0106b is already superseded by 0162b. Those historical states and record contents remain unchanged. ADR 0107b's severity vocabulary stays current; only its mutation roll-up and namespace preservation cease to apply. DDR 0105's artifact-review identifier policy is unaffected; its references to mutation identifiers are historical context.

## Decision

For both Claude Code and opencode, review executes passes 1–11 only. It has four progress steps and three complete-path progress events, with resolution and scope reported together under ADR 0189. It probes no mutation engine, executes no mutations, and writes only `review.md`. The Testing pass remains.

Remove Next Steps, Domain Alignment Check, Resilience Surface Triage, and Mutation Analysis from both review templates. Summary records goal coverage and scope creep in one or two lines without repeating findings. Decision contradictions remain Domain Alignment findings. Coverage Notes records a `Resilience:` outcome even with no surface, affected paths, and relevant idempotency and no-existing-pattern notes. Resilience findings, exclusive ownership, severity limits, all three audit recommendations, and the closing severity tally remain.

Stryker, its dependency, configuration, explicit scope override, and `test:mutation` remain independent development tooling. Retire only review's mutation smoke runner, fixtures, and script. No replacement mutation gate is introduced. Adversarial close changes only by removing its mutation exemption; models, delegation fan-out, audit criteria, and fix-loop defaults stay unchanged.

## Alternatives Considered

- A deterministic activation gate: rejected because most projects would still report unavailability.
- Removing resilience analysis or Coverage Notes: rejected because they retain useful findings and coverage context.
- Removing Stryker entirely: rejected because an independent local development run still has value.

## Consequences

Review no longer supplies mutation-engine evidence. Reports become intentionally incompatible with the retired section and identifier protocol. Independent mutation results do not enter review counts. The report keeps useful analysis without duplicated presentation; real-run savings remain a future measurement, not a claimed result.
