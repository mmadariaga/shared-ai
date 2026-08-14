# Apply Runner

Coordinator-owned checklist execution for `/sai-4-apply`. This card is fetched by the apply coordinator; it owns no change resolution, no worker dispatch, and no worker technical writes.

## Step Routing Tree

The coordinator routes each Step to exactly one of five exclusive shapes before any dispatch:

1. **RED block absent + at least one production file** → dispatch GREEN directly (green-direct): one GREEN worker invocation with the `implementation → green-verification` plan. No RED dispatch is issued.
2. **RED block absent + no production file** → dispatch exactly one RED green-exception: a test-authoring worker invocation with the `test-authoring → green-verification` plan.
3. **RED block present + no exact, unambiguous matching `## Step N` contract in `interfaces.md`** → STOP before any dispatch or write. A clean absence and an ambiguous match — more than one `## Step N` for the same integer — stop identically; no dispatch is issued and no fallback line is emitted.
4. **RED block present + exact unambiguous `## Step N` contract + at least one production file** → dispatch blind RED (`test-authoring → red-verification`), then GREEN (`implementation → green-verification`).
5. **RED block present + exact unambiguous `## Step N` contract + no production file** → dispatch exactly one RED green-exception (`test-authoring → green-verification`) that terminates with GREEN = pass.

## Dispatch Plan Selection

Each separate RED, GREEN, or green-exception dispatch is a separate worker invocation with exactly one immutable plan selected before dispatch: RED = `test-authoring → red-verification`, GREEN = `implementation → green-verification`, green-exception = `test-authoring → green-verification`. Selecting another plan for a later dispatch does not mutate the earlier plan.

## Progress Events

A progress event is the closed shape `{event: progress, step_ids: string[], changed_files: string[]}`: mark the reported step ids only in that dispatch's declared plan (the dispatch-local plan), ignore undeclared ids — the plan is never extended or amended — add every path to the changed-files union in first-seen order, and continue the same worker with exactly `continue_after_progress`. Progress events are nonterminal and never replace the single terminal lifecycle status.

## Coordinator Checklist Execution

The coordinator runs the Step's Verification Checklist after every dispatch returns, then sweeps the exact per-change scratch path, then compares — the ordering is checklist → scratch cleanup → comparison, and the same ordering holds before any redispatch. After each coordinator-owned run of the Step's Verification Checklist, the coordinator SHALL sweep exactly `.tmp/{change-name}/` again before the final path comparison or any subsequent dispatch. Clean, STOP, failure, or crash returns all trigger the sweep. When a sweep removes one or more paths, emit one trace line in the form `> Scratch cleanup: removed <paths>`; when only the per-change directory is removed, the line SHALL be exactly `> Scratch cleanup: removed .tmp/{change-name}/`; when both the per-change directory and its newly created empty parent are removed, the line SHALL be exactly `> Scratch cleanup: removed .tmp/{change-name}/, .tmp/`. An empty sweep emits no message. Scratch paths removed by the ordered sweep SHALL be excluded from observed changed paths, the plan cross-check, the `Subagent <-> git` comparison, the field-8 add-list, and line-count totals; every non-scratch path remains subject to the existing comparison and scope-drift rules. Scratch cleanup MUST NOT broaden recovery eligibility or authorize removal of another unexpected path; an unrelated out-of-scope path keeps its existing recovery or human-intervention handling.

## Dispatch-Kind Report Table

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
