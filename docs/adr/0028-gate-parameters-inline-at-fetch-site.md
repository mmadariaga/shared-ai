# ADR 0028: The feedback gate takes three named parameters supplied inline at the fetch site

## Status

Accepted

## Context

The `artifact-feedback-gate` change adds one shared completion-phase instruction (`sai/instructions/artifact-feedback-gate.md`) fetched by both `sai-1-spec` and `sai-2-design`. The gate must behave differently per step: a different artifact list, a different proceed label (`Finish step` vs `Continue`), and a different proceed action. SAI's existing convention passes a single value to a shared instruction via `$ARGUMENTS` substitution (e.g. `sai-2-design` fetches `implement-invocation.md` "using `{name}` as `$ARGUMENTS`"). Markdown instructions have no formal parameter mechanism, so a way to pass three distinct step-specific values had to be chosen.

This is change `artifact-feedback-gate`, Decision D1.

## Decision

Parameterize the shared instruction by three named inputs — `artifacts`, `proceed-label`, `next-action` — that the fetching body states as inline prose directly at the `Fetch @…` site, generalizing the existing "supply the value where you fetch" idiom beyond the single `$ARGUMENTS` slot. The instruction's header enumerates the three required parameters and halts-and-asks when any is missing.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Three named params inline at fetch site (chosen) | One shared source; generalizes the existing `$ARGUMENTS` idiom; each body reads self-documenting at the fetch site | Parameter names become a cross-file contract both bodies must match |
| Encode all three into one `$ARGUMENTS` string | Reuses the literal single-slot idiom unchanged | Brittle to parse in prose; the artifact list itself contains commas/globs |
| Inline the gate logic in each body file | No parameter mechanism needed | Violates the single-shared-source requirement; duplicated loop logic drifts across two files |
| Separate gate instruction per step | No parameters at all | Two near-identical files reintroduce the duplication the shared file exists to prevent |

## Consequences

- Both body files must supply the exact three parameter names; renaming a parameter later means editing both fetchers (moderate reversal cost — recorded here for that reason).
- The gate stays step-agnostic: per-step behavior (decision-summary format, proceed action) is referenced, not embedded (see D2).
- A missing parameter is a hard stop, keeping the informal prose-passing safe.

## Related

- `openspec/changes/artifact-feedback-gate/design.md` — Decision D1
- `openspec/changes/artifact-feedback-gate/specs/artifact-feedback-gate/spec.md` — "Shared parameterized gate instruction"
- `sai/instructions/artifact-feedback-gate.md` — new shared instruction created by this change
