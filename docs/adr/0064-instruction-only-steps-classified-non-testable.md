# ADR 0064: Instruction-file-only Steps are classified non-testable

## Status

Accepted

## Context

`shared-ai` is a prompt/instruction library: no language runtime, no test framework, no build, no CI. `package.json` declares no scripts. Changes to `sai/instructions/*.md` are verified by exact-string search over the edited file.

`/sai-4-apply` decides its dispatch count from a Step's testability: a Step whose body contains a `##### RED phase` block is testable and gets two ordered dispatches (a blind test-writer, then an implementation dispatch); a Step without one gets a single dispatch. A valid RED requires a test runner exiting non-zero with an **assertion** failure attributable to the behaviour under test.

Steps that only edit Markdown instruction text carry a `**Testing Strategy**` line and an `interfaces.md` section, which is the visual shape of a testable Step. That resemblance makes the classification easy to get wrong at dispatch time.

## Decision

Classify instruction-file-only Steps as **non-testable**: one dispatch per Step, no RED block, no blind test-writer. `interfaces.md` remains the verification checklist for the coordinator and the source `sai-3-implement` expands into GREEN verification blocks — it is simply not injected into a test-writer dispatch, because no such dispatch occurs.

State the classification explicitly at the top of `tasks.md` rather than leaving it to be inferred from the absence of a RED block.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Non-testable, single dispatch (chosen) | Matches what the repo can actually verify; the single dispatch runs the edit and its searches together | `interfaces.md` is written but never read by a subagent, which looks like waste until the classification is known |
| Testable, two dispatches | Exercises the split-dispatch path; keeps `interfaces.md` in its designed injection slot | The test-writer must produce a valid RED from string searches over Markdown with no runner to express one — it would halt on an invalid RED every time |

## Consequences

- Instruction-only changes never exercise the `writer` / `implementation` dispatch axes; their telemetry rows all carry `dispatch` = `single`.
- `subagent-attempt-instrumentation` instruments the blind test-writer's retry cost while dispatching none during its own application. Baseline data for the `writer` axis must come from a later change with real code Steps.
- The explicit classification line in `tasks.md` is the artifact a future reader checks before wondering why no RED block exists.

## Related

- `openspec/changes/subagent-attempt-instrumentation/design.md` — Decisions D6, D7
- `openspec/changes/subagent-attempt-instrumentation/tasks.md` — dispatch-classification note
- `sai/instructions/apply.md` — `## Step-Execution Subagent Dispatch` (testability signal)
- `docs/adr/0024-split-only-testable-steps.md`
