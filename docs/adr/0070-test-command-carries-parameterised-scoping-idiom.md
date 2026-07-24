# ADR 0070: Test Command carries the project's parameterised scoping idiom, not a bare suite command

## Status

Accepted

## Context

The blind test-writer classifies a RED result by attributing a test failure to the behaviour under test. In any repository with a pre-existing unrelated failure, an unscoped whole-suite run exits non-zero for reasons the test-writer cannot disambiguate — so it would have to reach for a scoping filter, which lives in `implementation.md`, the one file it may not read. Mandating a bare whole-suite command would therefore reproduce this change's own routing defect one level down.

The shape of the **Test Command** value is what every downstream prompt reads, so the choice of shape is hard to reverse and surprising (mandating a placeholder inside a "run command" field is unusual).

## Decision

**Test Command** carries the project's *parameterised scoping idiom*: the concrete test-project path plus the concrete filter flag, with a substitutable placeholder for the test identifier (for example `dotnet test tests/<Project> --filter FullyQualifiedName~<TestName>`). The flag *spelling* is derivable from **Stack**; the project path and the chosen filter expression are not, so they must be recorded. The field SHALL NOT pin a specific Step's filter value — fully-resolved, step-scoped commands stay in `implementation.md`, where they already work. A project whose runner offers no scoping records the base command; a project with no runner at all records the sentinel `None — no test runner in this project`.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Parameterised scoping idiom (chosen) | Lets the test-writer scope its own RED run without reading `implementation.md`; records only the non-derivable parts (path + filter flag) | Mandating a placeholder inside a run-command field is unusual and needs the scaffold to model it |
| Bare whole-suite invocation (e.g. `dotnet test`) | Simplest to write | Reproduces this change's own defect: an unscoped run in a repo with any unrelated failure is inattributable, forcing the writer toward the filter it cannot read |
| Fully-resolved per-Step commands in the field | No placeholder to interpret | `## Implementation Context` is written once per change, not once per Step; per-Step resolution already works in `implementation.md` |

## Consequences

- The template scaffold and schema instruction must model the parameterised form (with the placeholder and the no-runner sentinel), not a bare invocation, or designers will satisfy the letter of the field but not its intent.
- The scoping requirement is a normative SHALL with its own spec scenario, so an unscoped command is a spec violation rather than a style nit.
- Downstream, the sentinel also switches the test-writer into the unscoped-attribution rule: it attributes RED only to failures in tests it authored.

## Related

- `openspec/changes/mandate-test-run-command-in-implementation-context/design.md` — Decisions D2, D3
- `openspec/changes/mandate-test-run-command-in-implementation-context/specs/apply-test-impl-split/spec.md`
- `docs/adr/0069-test-command-sibling-field-outside-conventions-quota.md`
