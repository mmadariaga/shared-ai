# ADR 0027: A failing GREEN is a human decision, reached via bounded iteration

## Status

Accepted

## Context

When an implementation dispatch cannot make the test-writer's tests pass, the subagent faces an ambiguity: is the implementation buggy, or is the test/interface wrong? If the subagent is allowed to edit the test to force a pass, the mirroring channel reopens and the split-dispatch value is lost.

## Decision

The implementation dispatch iterates only over non-test files to make the tests pass. This iteration is bounded: it STOPs and reports the Step as unpassable when either (a) passing would require editing a test file or the declared interface, or (b) repeated attempts make no progress. It never crosses into editing tests/interface, even when it believes the test is wrong. The coordinator surfaces the conflict to the human, who decides whether the fault is the implementation, the test, or the interface.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Bounded iteration then halt to human (chosen) | Preserves the independence property; exposes the bug-vs-wrong-test ambiguity to the human who has full context | May feel slower when the test is genuinely wrong; requires human intervention |
| Let the subagent adjust the test when confident | Faster self-healing; reduces human interrupts | Reopens the mirroring channel; "bug vs wrong test" is exactly the ambiguity the split exists to expose |

## Consequences

- The implementation dispatch must explicitly check whether a fix would touch a test file before applying it.
- The coordinator must handle `GREEN = fail` with `STOP reached = yes` by surfacing the conflict and halting Step advancement.
- Human resolution is required; the pipeline does not auto-heal GREEN conflicts.

## Related

- `openspec/changes/consume-interfaces-artifact/design.md` — Decision D5
- `openspec/changes/consume-interfaces-artifact/specs/green-conflict-stop/spec.md` — "Bounded GREEN iteration with a defined unpassable boundary", "An unpassable GREEN halts to the coordinator"
- `sai/instructions/apply.md` — `## Step-Execution Subagent Dispatch` implementation dispatch rules updated by this change
