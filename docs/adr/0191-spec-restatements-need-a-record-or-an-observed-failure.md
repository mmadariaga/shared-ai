# ADR 0191: Spec instruction restatements need a decision record or an observed failure

<!-- adr-index: amends 0172c; refs ddr:0156a -->

## Status

Accepted

## Context

ADR 0172c split the sai-1-spec worker's instructions into one file per progress-plan step and, as a consequence, recorded that critical prohibitions are deliberately duplicated across the worker contract and the step files. DDR 0156a (now archived) turned that consequence into an invariant: neither copy could be removed, and any change to a prohibition had to update both.

The audit in issue #48 found that the duplication no longer protects anything. The external-findings rules DDR 0156a named no longer exist in the spec worker, which states that artifact review stays outside the phase. What remains are restatements of `sai/orchestration/worker-core.md` rules and coordinator-only duties inside `worker.md` and the step files. They add context load on every run and change no behavior, because the shared contract stays in force either way. ADR 0172c is a historical record and is not edited in place, yet it still states the dependency on the archived DDR.

## Decision

1. A restatement of a rule whose source is another file is kept in the `/sai-1-spec` worker contract or its step files only when a decision record or an observed failure justifies it. Without that evidence it is trimmed and the source file is referenced instead.
2. The duplication-invariant consequence of ADR 0172c ("deduplication is not cleanup") and its dependency on DDR 0156a are retired. Step-gated delivery itself, the pointer rule, and the sealed initial surface of ADR 0172c are unchanged.
3. The scope is the spec phase. The no-commit-guard restatement across the spec, design, and implement coordinators stays as it is until a later change deduplicates it in all three at once.

## Alternatives Considered

- **Edit ADR 0172c in place** — rejected: existing decision records are historical and change only through a new related record.
- **Leave ADR 0172c untouched with no amendment** — rejected: the index and the record would keep stating a dependency on an archived DDR.
- **Keep DDR 0156a active and trim anyway** — rejected: an active invariant forbidding deduplication would contradict the trim.

## Consequences

- Editors of the spec phase check a restatement against this rule: a record or an observed failure keeps it, otherwise the shared source is referenced.
- ADR 0172c keeps its historical text, including its "DDR 0156" citation; this record is the current statement of the duplication rule.
- Prohibitions that guard a documented failure stay duplicated where that failure is recorded.

## Related

- `docs/adr/0172c-step-gated-instruction-delivery.md` — the amended record
- `docs/ddr/archive/0156a-critical-prohibitions-duplicated-across-spec-steps.md` — the archived invariant
- `sai/orchestration/worker-core.md` — the shared contract the trimmed text points to
