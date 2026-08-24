# Apply Runner

Coordinator-owned checklist execution for `/sai-4-apply`. This card is fetched by the apply coordinator; it owns no change resolution, no worker dispatch, and no worker technical writes.

## Worker Request Shape

Each RED, GREEN, or green-exception dispatch carries only the opaque
`arguments_value` request, set by the coordinator to the resolved change name.
The matching Step contract, testing slice, and dispatch-local plan are
contract-defined prompt content, not additional request fields; binding-owned
metadata remains outside the worker request.

## Split-flow RED Gate

In split-flow, both RED and GREEN worker requests carry only
`arguments_value` plus the contract-defined prompt content.

When a Step has a RED block, an exact unambiguous interface contract, and at least one production file, the RED→GREEN route is **split-flow**. Only a valid RED result permits the subsequent GREEN dispatch. The direct GREEN route remains available only when no RED block is present; it does not weaken this split-flow gate.

## RED Intermediate and Recovery Hooks

In split-flow, every RED return is an intermediate result until the coordinator has independently established `RED result: valid`. A RED non-clean intermediate enters the shared diagnosis and, when eligible, uses `continue_after_recovery` on the same RED worker before GREEN. The coordinator completes the normal checklist, scratch sweep, baseline, allowed-file, changed-path, and report comparisons first, then diagnoses the worker and coordinator channels with the ordered `Reported`, `Evidence`, `Cause`, `Correction`, and `Verification` payload; raw output is never recovery input.

- If the diagnosis proves a concrete, safe **in-scope** RED correction, with a remaining recovery slot and no duplicate key, continue the **same RED worker** with exactly `continue_after_recovery`. The continuation occurs before GREEN and preserves the blind test-authoring plan; it never creates a fresh or replacement RED worker.
- An out-of-scope, unresolved, vetoed (`unrecoverable: true`), duplicate, transport-loss, coordinator-rejection, or exhausted diagnosis does **not** dispatch GREEN. It hands the Step back or stops for human intervention with the concrete artifact and point when available.
- A coordinator-proven **false veto** remains recovery-eligible when the evidence establishes a safe in-scope correction; a veto is not converted into a GREEN authorization by itself.
- A RED return with `STOP reached? yes`, including an unpassable RED failure, is diagnosed before any recovery continuation or GREEN dispatch. An unpassable RED closes with `status: failed`, `failure_class: blocking-contradiction`, boolean `unrecoverable`, concrete non-raw evidence, and STOP; it grants no GREEN authorization.

Only a valid RED result — from the initial blind dispatch or from an eligible same-worker recovery continuation — unlocks the split-flow GREEN dispatch. `passes`, `wrong-failure`, non-clean, failed, vetoed, unresolved, out-of-scope, duplicate, and STOP results never unlock GREEN.

## Step Routing Tree

The coordinator routes each Step to exactly one of five exclusive shapes before any dispatch:

1. **RED block absent + at least one production file** → dispatch GREEN directly (green-direct): one GREEN worker invocation with the `implementation → green-verification` plan. No RED dispatch is issued.
2. **RED block absent + no production file** → dispatch exactly one RED green-exception: a test-authoring worker invocation with the `test-authoring → green-verification` plan.
3. **RED block present + no exact, unambiguous matching `## Step N` contract in `interfaces.md`** → STOP before any dispatch or write. A clean absence and an ambiguous match — more than one `## Step N` for the same integer — stop identically; no dispatch is issued and no fallback line is emitted.
4. **RED block present + exact unambiguous `## Step N` contract + at least one production file** → split-flow: dispatch blind RED (`test-authoring → red-verification`); dispatch GREEN (`implementation → green-verification`) only after a valid RED result and after the RED recovery hooks above permit it.
5. **RED block present + exact unambiguous `## Step N` contract + no production file** → dispatch exactly one RED green-exception (`test-authoring → green-verification`) that terminates with GREEN = pass.

## Dispatch Plan Selection

Each separate RED, GREEN, or green-exception dispatch is a separate worker invocation with exactly one immutable plan selected before dispatch: RED = `test-authoring → red-verification`, GREEN = `implementation → green-verification`, green-exception = `test-authoring → green-verification`. Selecting another plan for a later dispatch does not mutate the earlier plan.

## Progress Events

A progress event is the closed shape `{event: progress, emitted_on: string, step_ids: string[], changed_files: string[]}`: mark the reported step ids only in that dispatch's declared plan (the dispatch-local plan), ignore undeclared ids — the plan is never extended or amended — add every path to the changed-files union in first-seen order, and continue the same worker with exactly `continue_after_progress`. Progress events are nonterminal and never replace the single terminal lifecycle status.

## Coordinator Checklist Execution

The coordinator runs the Step's Verification Checklist after every dispatch
returns, then sweeps the exact per-change scratch path per coordinator
§ Coordinator-Owned Scratch Cleanup (sole normative home for sweep rules and
exact non-empty trace forms), then compares — the ordering is checklist →
scratch cleanup → comparison, and the same ordering holds before any redispatch.
After each coordinator-owned run of the Step's Verification Checklist, the
coordinator SHALL sweep exactly `.tmp/{change-name}/` again before the final path
comparison or any subsequent dispatch. Clean, STOP, failure, or crash returns all
trigger the sweep. Scratch paths removed by the ordered sweep SHALL be excluded
from observed changed paths, the plan cross-check, the `Subagent <-> git`
comparison, the field-8 add-list, and line-count totals; every non-scratch path
remains subject to the existing comparison and scope-drift rules. Scratch cleanup
MUST NOT broaden recovery eligibility or authorize removal of another unexpected
path; an unrelated out-of-scope path keeps its existing recovery or
human-intervention handling.

## Dispatch-Kind Report Table

The apply phase declares an ordered report extension carried inside the terminal lifecycle envelope, with exactly nine report fields:

1. `Step executed`
2. `Per-item status`
3. `RED result`
4. `GREEN result`
5. `Deviations`
6. `Technical learnings/friction`
7. `STOP reached?`
8. `Files modified`
9. `Attempts per phase`

The coordinator validates every reported value against this declared field list and never invents, reorders, or drops a field.

Field values follow the dispatch kind, keyed on the dispatch:

- **green-direct** — field 3 (`RED result`) = `n/a`; field 4 (`GREEN result`) carries the real value.
- **red (blind test-authoring dispatch)** — field 3 carries the real value; field 4 (`GREEN result`) = `n/a`.
- **green (implementation dispatch)** — field 4 carries the real value; field 3 (`RED result`) = `n/a`.
- **green-exception** — field 3 carries the real value; field 4 (`GREEN result`) = `pass`.

Field 8 is required in every report kind: An explicitly present empty `Files modified` list is valid; an omitted field 8 is malformed. In the omission case the coordinator prints exactly "Subagent report missing field 8 (Files modified). Cannot produce a reliable pre-commit report. Review the staged state manually before committing." and pauses before proposing the commit message. Field 9 is the sole soft-degradation exception: an absent or empty field 9 never makes a report malformed and never blocks checkbox marking, the pre-commit report, or the commit gate. Scratch paths must never appear in field 8.

## Appendices

### Appendix: Plan vs Final Implementation

After the coordinator's verification passes and, when applicable, the Human Verification gate confirms, append the report's deviations to the `## Appendix: Plan vs Final Implementation` section at the end of `openspec/changes/{change-name}/implementation.md`. Create the section on the first deviation and append below the existing entries thereafter; a Step with zero deviations adds no empty entry. Block format:

```markdown
### Step N — <Short title of the deviation>

**Plan:** <What the plan originally said or required>
**Final:** <What was actually implemented>
**Reason:** <Why the change was necessary>
```

### Appendix: Execution Telemetry

In the same slot as the deviations appendix — after the coordinator's verification passes and, when applicable, the Human Verification gate confirms, and before the commit — append one row per field-9 entry to the `## Appendix: Execution Telemetry` section. Create the section once on the first row and append below the existing rows thereafter; never create a second section. The section holds exactly one table, with these columns in this fixed order:

```markdown
| Step | dispatch | phase | attempts | first_failure | note |
|---|---|---|---|---|---|
```

Column sources: `Step` is the integer `N` of the Step just executed, and `dispatch` is one of `green-direct` / `red` / `green` / `green-exception` — both supplied by the coordinator from the dispatch it issued, never read from the subagent report. `phase` is exactly `red` or `green`. `attempts` is a positive integer counting verification runs regardless of outcome, never starting at `0`. `first_failure` draws from the closed vocabulary `assertion` / `setup` / `import` / `other` / `n/a`. `note` is required only when `attempts` > `1` and states what changed between attempts. Write exactly one row per field-9 entry, no more and no fewer.

## Appendix Order (invariant)

Both appendices live at the end of `implementation.md` in this fixed order — `## Appendix: Plan vs Final Implementation` first, then `## Appendix: Execution Telemetry`. The order does not depend on which section a given run happened to create first; when the deviations section is created while the telemetry section already exists, insert it above the `## Appendix: Execution Telemetry` heading rather than appending it at the end of the file.

## Final sweep and terminal lifecycle

The coordinator enters this section only after the Step loop, every applicable Human Verification gate, every required per-Step commit gate, and the existing appendices have completed. A run that halts before this Final sweep performs neither learnings promotion nor terminal documentation evaluation.
The retired monolithic apply instruction is not an executable source.

### Final sweep

Scan the complete `openspec/changes/{change-name}/implementation.md` file and verify that every checkbox that should be checked is `[x]`. Report any unchecked item and do not enter the terminal lifecycle until the sweep passes. This is the final checkbox sweep, not a new Step dispatch.

### Learnings Promotion Pass

After a passing Final sweep, perform exactly one learnings promotion pass for the run. Read the complete `## Appendix: Plan vs Final Implementation` from `implementation.md` and use the coordinator's field-6 technical-learnings memory only as a supplementary source. Do not promote per Step, do not promote from a successful Step with no deviation, and do not dispatch promotion to RED or GREEN.

For each candidate, apply only the single SAI learnings classification: the candidate must name a repository-level artifact rather than a symbol or file introduced or renamed by this change. Use the named artifact as the section key, supersede key, and reader anchor; use the candidate's `**Final:**` value as what works instead. Write only the root `SAI_LEARNINGS.md` and preserve its four-section format. If there is no qualifying entry and the file is absent, do not create an empty file. If the promotion writes the file, disclose the root path, entries added and superseded by section, and any contradicted pre-seeded keys.

### Terminal documentation evaluation

Immediately after the single promotion pass, evaluate the terminal documentation set from terminal working-tree state with tracked and untracked paths visible. The eligible set is closed:

- changed paths under `docs/**`;
- root `SAI_LEARNINGS.md` only when this run's promotion pass wrote it; and
- changed root `GLOSSARY.md`, whether tracked-modified or untracked.

The terminal set is proposed whenever at least one eligible path exists, even when promotion produced no qualifying entry. When none of these conditions holds, propose no terminal documentation commit and ask no terminal authorization question. never resolve `GLOSSARY.md` from `openspec/changes/{change-name}`. `openspec/changes/**`, `implementation.md`, unrelated working-tree paths, the changed-files union, and every per-Step field-8 add-list remain outside this set.

### Terminal visibility listing

Before proposing a terminal documentation commit message and before authorization, print a non-mutating visibility listing. Show the exact eligible paths under `Will be committed` and every working-tree path outside the closed set under `Will NOT be committed`. The preview does not stage, unstage, or otherwise mutate the Git index, does not depend on a Step number or worker report, and does not use a broad working-tree sweep.
The visibility listing is followed by the proposed commit message and then authorization; the preview remains non-mutating.

### Terminal authorization and commit

Apply `sai/policies/commit-rules.md` before composing the message. The proposed message describes only the terminal documentation paths and staged hunks. Keep terminal staging separate from per-Step field-8 staging and add-lists. After authorization, stage exactly the closed terminal set; SHALL NOT use `git add -A`, a broad staging fallback, or any path under `openspec/changes/{change-name}/`.

When `session_commit_authorized` is inactive, present the native closed-choice options `yes (Recommended)` / `no` / `Allow on this session` for this final gate — the same option set as every commit-authorization gate in the pipeline: only explicit `yes` (or an `Allow on this session` selection, which additionally activates `session_commit_authorized` per its definition in `sai/commands/apply/coordinator.md`) authorizes `git add` and `git commit`. An off-option reply or silence is NOT a decline: re-present the same ask unchanged through the native picker per the invalid-input rule in `@sai/policies/remember.md`; only explicit `no` declines. The session-scoped grant and its boundaries follow `## Authorization Scope` in `sai/policies/commit-rules.md`. When the session flag is already active, including fast-track pre-activation, skip only this authorization ask; still print the visibility listing and proposed message before staging and committing. On decline, leave eligible files in the working tree, describe what remains uncommitted, and continue to MANDATORY STOP without retrying.

### MANDATORY STOP

After the terminal documentation commit succeeds, or after a no-op terminal evaluation or declined terminal authorization, invoke the existing standalone or chained `terminal_navigation` action. The final standalone completion literal remains owned by `invocation.md`; do not continue into another implementation Step from this section.
