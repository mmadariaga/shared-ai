## Why

`sai/instructions/apply.md:116` instructs the `/sai-4-apply` coordinator to inject a test **run command** into the blind test-writer's prompt, and `apply.md:126` requires that subagent to run the test command and classify the RED failure type — but `## Implementation Context` has no field that carries a run command, because `sai/instructions/design.md:170` mandates exactly three fields (**Stack**, **Conventions**, **Avoid**). The instruction is therefore not merely under-served: it cannot be followed, since the subagent is forbidden from reading `implementation.md` where `/sai-3-implement` demonstrably writes the correct command.

## What Changes

- `## Implementation Context` gains a fourth mandatory field — **Test Command** — carrying the exact command that runs this project's tests, plus the project's scoping idiom in parameterised form where the runner supports one, derived by `/sai-2-design` from actual codebase research alongside Stack / Conventions / Avoid. A project with no test runner records the explicit sentinel `None — no test runner in this project`.
- The field sits **outside** the **Conventions** bullet quota: a run command is an infrastructure fact, not a project-specific convention, and must not compete for the 2–5 bullet budget.
- `openspec/schemas/sai-workflow/templates/tasks.md` and the `tasks` artifact instruction in `openspec/schemas/sai-workflow/schema.yaml` gain the field.
- `sai/instructions/apply.md` names the **Test Command** field explicitly in the blind test-writer's injected slice instead of paraphrasing a "testing-relevant slice … run command".
- `sai/instructions/implement.md` stops describing `## Implementation Context` as a three-field contract (`implement.md:19`, `implement.md:408`) — otherwise the new field is ignored by construction.
- No **BREAKING** changes: existing archived changes are not backfilled, and a plan lacking the field still triggers only the existing whole-section STOP condition.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `tasks-implementation-context`: the section's mandatory field set grows from three to four (adding **Test Command**); the Expertise Profile contract read by `/sai-3-implement` grows correspondingly; the schema instruction and the `tasks.md` template carry the new field.
- `apply-test-impl-split`: the blind test-writer's injected testing slice names the **Test Command** field of `tasks.md`'s `## Implementation Context` as the source of the command it is required to run.

## Impact

- `sai/instructions/design.md` — the three-field mandate at `:170` becomes four; the `interfaces.md` prohibition at `:194` is unaffected and stays as-is.
- `sai/instructions/implement.md` — `:19` and `:408` describe the section as three fields / a complete contract; both must change.
- `sai/instructions/apply.md` — `:116` (test-writer prompt contents): the enumeration both **shrinks** (test file location/naming is dropped, since this change guarantees no such field will exist) and **sharpens** (it names the **Stack** and **Test Command** fields instead of paraphrasing). `:126`'s RED classification gains the scoped-run rule. No change to the implementation dispatch's prompt contents.
- `openspec/schemas/sai-workflow/templates/tasks.md` and `openspec/schemas/sai-workflow/schema.yaml` — template scaffold and artifact instruction.
- `sai/instructions/backfill.md` — explicitly out of scope; it does not read `## Implementation Context`.
- Sequencing: this change should land **after** `reconcile-apply-testability-routing`, which determines which Steps reach the blind test-writer at all and renames dispatch-routing requirements this change's text sits beside. All `apply.md` line numbers above were verified against the current working tree and will shift once that change lands.

## Proposal Research Documentation

**Local files**:
- `sai/instructions/apply.md:95-149` — test-writer and implementation dispatch prompt contents, RED classification rules
- `sai/instructions/design.md:162-199` — `## Required Documentation` + `## Implementation Context` three-field mandate, `interfaces.md` no-testing-stack rule
- `sai/instructions/implement.md:10-33`, `:403-414` — STOP condition, Expertise Profile three-field contract, plan hard rules
- `openspec/schemas/sai-workflow/templates/tasks.md` — the `## Implementation Context` scaffold
- `openspec/schemas/sai-workflow/schema.yaml:134-168` — `tasks` artifact instruction
- `openspec/specs/tasks-implementation-context/spec.md` — current three-field requirements
- `openspec/specs/apply-test-impl-split/spec.md:19-45` — test-writer blindness and injected testing context
- `openspec/changes/reconcile-apply-testability-routing/specs/apply-test-impl-split/spec.md` — pending routing deltas and the RENAMED requirement
- `GLOSSARY.md` — domain language (Blind Test-Writer, Step Contract, Implementation Dispatch)

**External URLs**: None

## Additional Notes

- **This is a routing problem, not a knowledge problem.** `/sai-3-implement` already derives the correct run command by its own research and writes it into `implementation.md` in every archived change. The data exists and is correct; it lives in the one file the blind test-writer is forbidden to read. That is why the fix is one field and not a research mechanism.
- **Only the run command is mandated.** The test framework already arrives via **Stack** (mandatory; named in 13 of 18 archived changes, the other 5 having no test surface). Test file location and naming appeared in only 2 of 18, but the blind test-writer *may* read existing test files and test infrastructure (`apply.md:123`), so it can recover those from the suite. A run command cannot be recovered that way with any reliability. General rule: mandate only what the consumer cannot obtain under the permissions it already has.
- **The consumer is exactly one dispatch.** Once `reconcile-apply-testability-routing` lands, a Step carrying a RED block but no available **Step Contract** routes to a single dispatch, which receives the full Step text including its verification commands and therefore needs nothing added. Only the blind test-writer is required to run a command it is not given.
- **Not in `interfaces.md`.** `design.md:194` already forbids a testing-setup section there and single-sources the testing stack in `tasks.md`.
- Alternatives considered and rejected: the original five-field testing sub-block (four of five fields would mandate already-present or already-reachable information); an exemplar-test pointer (deferred — no evidence of need, new staleness failure mode, nothing validating the path); researching the command inside the `/sai-4-apply` coordinator via a budget-explorer (always fresh, but reintroduces discovery into the execution phase — reconsider only if telemetry shows RED attempts stay high with the command present); requiring one **Conventions** bullet to cover testing (the failure is structural, not a matter of designer discipline).
- Trade-offs accepted: in some stacks the command is partly recoverable from a test project file or a `scripts.test` entry the writer may already read, so the field will sometimes duplicate reachable information; design must determine the command even for changes whose Steps all route to a single dispatch; a command recorded at design time can go stale before the plan is applied.
- **The field carries the scoping idiom, not one Step's filter value.** Archived plans overwhelmingly invoke the runner *filtered* (e.g. `dotnet test tests/<Project> --filter …`), because RED classification requires attributing the failure to the behaviour under test — an unscoped run in a repo with any pre-existing unrelated failure exits non-zero for reasons the writer cannot disambiguate. So **Test Command** carries the concrete test-project path and filter flag with a substitutable placeholder for the test identifier; fully-resolved per-Step commands stay in `implementation.md`. Mandating the bare whole-suite form would have reproduced this change's own defect one level down, leaving the filter in the file the test-writer may not read.
- **A project with no test runner uses an explicit sentinel.** `None — no test runner in this project` is a researched finding, not placeholder text — necessary because 5 of the 18 archived changes had no test surface. (This repository is not such a case: it has no `scripts` block in `package.json`, but it does have a runner — `node --test test/` over 17 test files — which is precisely why the field must be *researched* rather than read off a `scripts.test` entry.)
- Justification does not depend on the retry hypothesis: this closes a promise the instruction set already makes, regardless of whether idiom-mismatch retries turn out to be the dominant cost sink.
