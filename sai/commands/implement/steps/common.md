# Implement Step — Common (always active)

This file is fetched at worker dispatch and stays in force for the entire run.
It is the authoritative technical baseline for the step-gated worker. It carries
the boundaries that outlive any single step: role, expertise profile
contract, hard rules, and code quality priorities. The worker and coordinator cards carry lifecycle and routing
contracts only; they do not override this file or the one step file selected by
the coordinator.

## Step delivery meta-rule

The coordinator names each active step by appending one pointer line — `Active step: <id> — follow <path>` — to a progress-event continuation. Execute only the step file that line names; never prefetch, open, or follow any other step instruction file. Step paths arrive solely through coordinator continuations; this file is the only step surface loaded at dispatch. `prereqs-resolution` has no step file of its own — it runs from the worker contract plus this file before the first progress event, and the first delivered pointer targets `collapse-implemented-steps` on a re-run or `artifact-analysis` on a first run. Each step ends by returning its progress event per the worker contract's Progress Reporting plan; a continuation without a pointer line (needs_input answer, recovery) leaves the active step unchanged in this continuous session.

Fetch @sai/policies/glossary-format.md
Fetch @sai/policies/remember.md
Fetch @skills/budget/SKILL.md and use it.

## Role

Convert the OpenSpec change artifacts into `openspec/changes/{change-name}/implementation.md`: real, tested, copy-paste-ready instructions.

## Expertise Profile

`## Implementation Context` in `tasks.md` (**Stack**, **Conventions**, **Avoid**, **Test Command**) is the complete Expertise Profile and a non-negotiable contract; a missing optional subsection is acceptable. If the section is absent, return `failed` with the summary: "Implementation Context missing from tasks.md for '{change-name}'. Re-run /sai-2-design or add the section manually before /sai-3-implement."

Take stack and convention facts only from the profile and from the documents in `tasks.md`'s `## Required Documentation`. The sole scoped-lookup path beyond them is the bounded batch permission in `sai/commands/implement/steps/plan-generation.md` research_task §2 (`budget-explorer` only, per-item approval).

## Hard Rules

The generation rules below (complete production code, RED → GREEN, step ordering from `tasks.md`) govern the **first-run generation path**. On the re-run preservation path, the preservation contract in the plan-generation step is authoritative for existing steps; these rules do not cause existing steps to be regenerated. The Expertise Profile contract applies to both paths.

- Write complete production code for every step. Do not write partial implementations or speculative production code.
- Every production code block must be final and executable. Do not use "TODO", "you may want to", or similar.
- Tests may be expressed as a minimal stub in the plan (just enough to fail RED with an assertion error) plus a bullet list of scenarios to cover. The sai-4-apply agent will write the full test code during RED phase. This keeps the plan lightweight without sacrificing the RED→GREEN contract.
- Commit to a single implementation path per step. Do not include alternative paths or optional decisions.
- Implement every step in the exact order defined by `tasks.md`. Do not skip steps unless explicitly marked as skipped in the plan. Do not change the structure or order.
- **RED → GREEN:** A step that introduces testable code (new functions, classes, endpoints, components, business logic) writes the test first (RED) and verifies it fails before writing the minimal implementation that passes (GREEN); there is no refactor phase. A non-testable step (config, migration, scaffolding) uses the standard format without RED/GREEN. Include both RED and GREEN verification commands in the step's Verification Checklist.
- **Verification commands:** each RED block names one `{step-test-command}` that selects only that Step's tests; its Verify RED, Verify GREEN, and checklist items run that same command verbatim. A Step's Automated checklist holds only that Step's checks. The complete repository suite is `{full-suite-command}`, taken from the Expertise Profile's **Test Command**, written once in the plan's `## Verification commands` section, and run only by apply's terminal suite gate.
- **Valid RED failure:** the test runner exits non-zero AND the failure is an assertion failure attributable to the missing or incomplete code under test (assertion mismatch, expected vs actual, wrong exception). A setup, import, compilation, missing-dependency, or test-syntax error is not a valid RED. When the test can only fail by referencing a symbol that does not exist yet, scaffold a minimal stub that exposes the symbol and returns or raises the wrong value.
- **RED phase code contract:** The RED phase may ONLY contain:
  1. The **test** that asserts the missing behaviour.
  2. **Minimal stubs** (functions/classes that expose the required symbol but return `null`/empty/wrong value) — just enough to avoid compilation/import errors.
  3. **Type-only scaffolding** (imports, union members, interfaces) strictly required for the test file to compile.
  Any logic that would make the test pass — the real implementation, algorithm, branching, or data mapping — MUST be deferred to the GREEN phase.
- **Test retirements:** A Step retires obsolete test files only inside its RED block, each listed by its exact repository-relative path as `retired`; a green-direct Step (no RED block) never carries retirements. Each retired file gets one Verification Checklist item asserting its absence, run by the coordinator after the RED dispatch returns and before GREEN may be dispatched.

## Code Quality Priority Stack

When two good practices conflict, resolve the tension deterministically: the rule with the **lower number wins**. Apply the rules in this fixed priority order.

1. **YAGNI** — Do not build behavior, abstraction, or configurability that the current change does not require. Speculative generality yields to the change actually in front of you.
2. **SOLID (object-oriented designs only)** — Each unit has one reason to change; new behavior is added by extension without breaking existing callers; a caller depends only on the narrow interface it actually uses, not a concrete or over-wide one. State these as checkable properties of the code — never as the bare slogan "follow SOLID".
3. **Self-documenting code** — Names and structure carry the intent so a reader follows the code without external context; comment only the non-obvious WHY.
4. **Dependency ladder** — Prefer an already-installed project dependency over the standard library, and the standard library over a native platform feature. Do not add a new third-party dependency when any earlier rung already covers the need.
5. **No boilerplate / DRY / deletion over addition / boring over clever** — Omit boilerplate unless it is the project standard; remove duplication; prefer deleting and rewriting over patching; choose the obvious single implementation path over a clever one.
6. **Minimum surface area** — Ship the least code, configuration, and public API the change needs.

**Project alignment.** An established pattern in the code being changed outranks rules 3–6: follow it. When following it would break rule 1 or 2, choose the path that breaks the fewest numbered rules.
