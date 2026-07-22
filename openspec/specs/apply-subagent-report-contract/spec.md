# apply-subagent-report-contract Specification

## MODIFIED Requirements

### Requirement: Subagent returns a compact fixed-field report

When a Step-execution subagent finishes (or stops), it SHALL return a compact report containing exactly these fields:

1. **Step executed** — the Step number `N`.
2. **Per-item status** — done/failed status for each of the Step's checkbox items.
3. **RED result** — one of: valid / passes / wrong-failure / `n/a`, including the error type when applicable.
4. **GREEN result** — pass / fail / `n/a`.
5. **Deviations** — a list of `{plan, final, reason}` entries for the appendix; empty if none.
6. **Technical learnings / friction** — reusable, self-contained, actionable facts discovered during execution; empty if none (per `apply-technical-learnings-memory`).
7. **STOP reached?** — yes/no, with the exact marker message when yes.
8. **Files modified** — paths modified or created by the subagent during this Step, relative to the repo root, one path per entry; empty list if the subagent modified nothing.
9. **Attempts per phase** — a list of `{phase, attempts, first_failure, note}` entries, one per verification phase this dispatch actually ran.

The report shape (9 fields, order, semantics) is stable across all dispatch kinds. Which fields carry a real value depends on the dispatch:

- **Non-testable Step (single dispatch):** fields 3 and 4 both carry real values (RED result and GREEN result) exactly as before.
- **Testable Step — test-writer dispatch:** field 3 (RED result) carries a real value; field 4 (GREEN result) is `n/a` because the test-writer does not write or verify GREEN.
- **Testable Step — implementation dispatch:** field 4 (GREEN result) carries a real value; field 3 (RED result) is `n/a` because the implementation dispatch does not author or verify the RED test.

Field 8 is required in every report kind (an empty list is a valid value but an absent field is a malformed report). Field 9 is the sole exception to the fixed-field list: it is expected but not required, and its absence SHALL NOT make a report malformed (see "Field 9 degrades softly and never blocks the workflow"). The report SHALL NOT include raw file contents, full tracebacks, or iteration logs.

#### Scenario: Non-testable Step completes cleanly

- **WHEN** a single subagent finishes a non-testable Step with no deviations and no STOP
- **THEN** it returns the report with Step N, per-item done statuses, RED result, GREEN=pass, empty deviations, technical learnings (empty or populated), STOP reached = no, `Files modified` = the set of paths the subagent changed, and field 9 carrying one entry per phase the dispatch actually ran — and nothing else

#### Scenario: Test-writer dispatch reports RED with GREEN `n/a`

- **WHEN** the test-writer subagent for a testable Step finishes after verifying a valid RED
- **THEN** its report sets field 3 (RED result) = `valid`, field 4 (GREEN result) = `n/a`, populates field 8 with the test/stub files it wrote, carries exactly one field-9 entry with `phase` = `red`, and carries per-item status, deviations, learnings, and STOP as usual

#### Scenario: Implementation dispatch reports GREEN with RED `n/a`

- **WHEN** the implementation subagent for a testable Step finishes after verifying GREEN
- **THEN** its report sets field 4 (GREEN result) = `pass`, field 3 (RED result) = `n/a`, populates field 8 with the production files it modified, carries exactly one field-9 entry with `phase` = `green`, and carries per-item status, deviations, learnings, and STOP as usual

#### Scenario: Subagent stops at a STOP & COMMIT

- **WHEN** a subagent's Step reaches a STOP & COMMIT
- **THEN** the report sets "STOP reached? = yes" and includes the exact marker message, alongside the other fields for the work completed up to the STOP

#### Scenario: RED check is invalid

- **WHEN** the test-writer's RED verification either already passes or fails for a non-assertion reason
- **THEN** the report's field 3 (RED result) records `passes` or `wrong-failure` (with the error type), so the coordinator can act on the invalid RED rather than dispatching the implementation subagent

#### Scenario: Subagent modifies no files

- **WHEN** a subagent executes a Step that produces no file changes (for example, a Step that only runs a verification command)
- **THEN** the report's `Files modified` field is an empty list, not absent; the report remains a 9-field report and the coordinator cross-checks against an empty set

#### Scenario: Subagent omits field 8

- **WHEN** a subagent returns a report without `Files modified`
- **THEN** the coordinator treats the report as malformed per `apply-pre-commit-file-report` and surfaces the omission to the user before any commit is proposed

## ADDED Requirements

### Requirement: Field 9 records attempts per verification phase

Field 9 (`Attempts per phase`) SHALL be a list of entries, each with exactly these four keys:

- `phase` — one of `red` or `green`. No other value is permitted; there is no dispatch-kind value on this field.
- `attempts` — a positive integer counting how many times the subagent ran that phase's verification command within this dispatch, **regardless of outcome**. The counter SHALL NOT start at `0`. `attempts` = `1` means the phase's command was run once; it does NOT by itself imply the phase succeeded.
- `first_failure` — the error class of the phase's **first failing run**, drawn from this closed vocabulary and no other: `assertion` / `setup` / `import` / `other` / `n/a`. `n/a` SHALL be used only when the phase's first run did not fail. The vocabulary deliberately reuses the invalid-RED classification the dispatch rules already apply. A subagent SHALL NOT coin a token outside this set; an unrecognised token SHALL be recorded as `other`.
- `note` — required only when `attempts` is greater than `1`. It SHALL state **what changed between attempts**, not what error appeared. The error class is already carried by `first_failure`. The note SHALL NOT contain a traceback, a raw file excerpt, or an iteration log.

Because `attempts` counts runs rather than successes and `first_failure` is `n/a` only for a first run that did not fail, a phase that failed once and then halted (`attempts` = `1`, `first_failure` = `import`) is distinguishable from a phase that passed first try (`attempts` = `1`, `first_failure` = `n/a`). This distinction is required: the blind test-writer does not iterate on an invalid RED — it halts — so without it the single most diagnostic failure mode would be recorded identically to a clean pass, and the resulting mean would understate exactly the cost this instrumentation exists to expose.

The closed `first_failure` vocabulary is what makes the column aggregable across changes. An open set would let each dispatch coin its own token, and the column would degenerate into narrow-cell prose — the same weakness this change rejects for a free-text retry field.

Field 9 SHALL carry an entry for `phase` = `red` exactly where field 3 (RED result) carries a non-`n/a` value, and an entry for `phase` = `green` exactly where field 4 (GREEN result) carries a non-`n/a` value. This binding makes field 9 self-validating against the per-dispatch table above and requires no special case for the non-testable Step's single dispatch, which runs both phases and therefore emits two entries.

Field 9 SHALL NOT report which dispatch kind produced it. The dispatch kind is supplied by the coordinator when persisting the telemetry (per `apply-execution-telemetry-appendix`), because the coordinator already knows which dispatch it issued and the subagent is deliberately blind to the orchestration.

The counter measures attempts within a single dispatch. It SHALL NOT be described or presented as a total cost figure for a Step, because it does not count re-dispatches of a whole Step after a coordinator disagreement.

#### Scenario: Phase passes on the first attempt

- **WHEN** a dispatch runs a verification phase and it passes on the first run
- **THEN** field 9 carries an entry for that phase with `attempts` = `1`, `first_failure` = `n/a`, and no `note`

#### Scenario: Phase needs several attempts

- **WHEN** an implementation dispatch's GREEN command fails twice on a compiler type error before passing on the third run
- **THEN** field 9 carries one entry with `phase` = `green`, `attempts` = `3`, `first_failure` = `other` (the closed vocabulary's catch-all for a class outside `assertion` / `setup` / `import`), and a `note` stating what the subagent changed between attempts — containing no traceback, file excerpt, or iteration log

#### Scenario: Invalid RED is distinguishable from a clean pass

- **WHEN** the blind test-writer's RED verification fails with an import error and the dispatch halts without iterating, per the invalid-RED rule
- **THEN** field 9 carries one entry with `phase` = `red`, `attempts` = `1`, `first_failure` = `import`, and no `note` — recording the failure rather than reading identically to a phase that passed on its first run

#### Scenario: Subagent reports an error class outside the vocabulary

- **WHEN** a subagent would describe a first failure with a token that is not `assertion`, `setup`, `import`, or `n/a`
- **THEN** it records `other`, so the column stays aggregable across changes rather than accumulating per-dispatch synonyms

#### Scenario: Non-testable Step with a RED block emits both phases from one dispatch

- **WHEN** the single dispatch of a non-testable Step whose body contains a RED block runs both the RED and the GREEN verification commands
- **THEN** field 9 carries exactly two entries, one with `phase` = `red` and one with `phase` = `green`, matching the non-`n/a` values in fields 3 and 4 — with no new enum value and no special case

#### Scenario: Non-testable Step without a RED block emits one phase

- **WHEN** the single dispatch of a non-testable Step whose body contains no RED block runs only the GREEN verification command
- **THEN** field 3 (RED result) is `n/a` and field 9 carries exactly one entry, with `phase` = `green`, per the binding rule

A field 9 that disagrees with fields 3/4 SHALL be resolved in both directions, and neither direction is a malformed report:

- **Surplus entry** — an entry whose phase is `n/a` in fields 3/4. The coordinator SHALL treat it as unreliable telemetry and omit it from the appendix.
- **Missing entry** — a non-`n/a` value in field 3 or 4 with no matching entry. The coordinator SHALL treat that phase as absent telemetry under the soft-degradation rule: record whatever entries are present, write no row for the missing phase, and continue. A partially-populated field 9 is a soft-degradation case, NOT a binding violation to surface and NOT grounds for the malformed-report treatment.

#### Scenario: Field 9 carries a surplus entry

- **WHEN** a report's field 9 carries a `green` entry while field 4 (GREEN result) is `n/a`
- **THEN** the coordinator SHALL omit that entry from the appendix rather than recording it, and SHALL NOT block the commit gate on the disagreement

#### Scenario: Field 9 is missing an entry the binding requires

- **WHEN** a report's field 3 (RED result) is `valid` but field 9 carries only a `green` entry
- **THEN** the coordinator SHALL record the `green` row, write no `red` row, treat the report as well-formed, and continue to the commit gate without surfacing a binding violation

### Requirement: Field 9 degrades softly and never blocks the workflow

Unlike field 8, an absent or empty field 9 SHALL NOT make a report malformed. The coordinator SHALL NOT surface a missing-field-9 warning under the malformed-report rule, SHALL NOT pause for the user on its account, and SHALL NOT block checkbox marking, the pre-commit file visibility report, or the commit gate. Instrumentation SHALL never be able to stop the workflow.

When field 9 is absent, the coordinator SHALL proceed with every other workflow step unchanged and simply record no telemetry rows for that dispatch.

#### Scenario: Subagent omits field 9

- **WHEN** a subagent returns an otherwise valid report with no `Attempts per phase` field
- **THEN** the report is NOT malformed, the coordinator continues to checkbox marking and the commit gate normally, and no telemetry rows are appended for that dispatch

#### Scenario: Field 9 omitted alongside a valid field 8

- **WHEN** a report populates field 8 correctly but omits field 9
- **THEN** the `apply-pre-commit-file-report` malformed-report message SHALL NOT be printed, because that rule keys on field 8 only
