# Step Contract Format

Canonical structure for the `## Step N` section in `interfaces.md` — the single source of truth for the per-step contract format that specifies public interfaces and test assertions. Consumed by reference; never restated at a consuming surface.

This file is the authoritative format specification for `## Step N` sections emitted by `sai/commands/design/steps/interfaces.md` and consumed by test authors and implementation steps.

## Section structure

Each step that introduces a new/modified public interface or a testable assertion is represented as:

```
## Step N: <title>

**Interfaces**: <new or modified public signatures introduced in this step — function/method signatures, exported types, class or module public surface. Signatures only, no implementation body.>

**Test assertions**: <the exact assertions that verify this step — expected input → expected output/behavior — each anchored to a `specs/**/*.md` requirement or scenario by path.>
```

## Field rules

- **Section heading**: `## Step N: <title>` where N matches the integer from `tasks.md`
- **Interfaces**: new or modified public signatures introduced in this step (function/method signatures, exported types, class or module public surface). Signatures only; no implementation body.
- **Test assertions**: the exact assertions that verify this step — expected input → expected output/behavior — each anchored to a `specs/**/*.md` requirement or scenario by path

## Omission rule

A step that introduces neither a new/modified public interface nor a testable assertion (e.g. a pure config or scaffolding step) is omitted entirely — do NOT emit an empty `## Step N` section. When every step introduces neither a new/modified public interface nor a testable assertion, `interfaces.md` carries exactly the sentinel `None — no step contracts` followed by a one-line reason naming why no step admits a contract — the sentinel is the sole content of the file in that case, keeping the design worker's exists-and-non-empty verification and the `change-overview` artifact's `requires: [interfaces]` dependency satisfiable for every designed change.

## Anchoring rule

Test assertions are each anchored to a `specs/**/*.md` requirement or scenario by path.

## Key constraints

- **Self-contained**: The signature plus its anchored assertions must be sufficient to author the step's tests without reading `implementation.md`, `design.md`, or source code.
- **No testing-stack section**: Do NOT add a testing-setup, stack, or `## Implementation Context` section to `interfaces.md`; the testing stack stays single-sourced in `tasks.md`'s `## Implementation Context`.
- **Keep out of tasks.md**: Signatures and assertions are the "detailed behavior" that `tasks.md`'s conciseness rule excludes. `tasks.md`'s `**Testing Strategy**` stays high-level *approach* prose (what kind of test, what surface it exercises); the concrete assertion values live only here. Never restate them into `tasks.md`.
- **No non-Step N sections**: `interfaces.md` begins directly with its first `## Step N` section (or the `None — no step contracts` sentinel); no `## Target State` section and no `### Architecture Snapshot` or `### File Manifest` subsection appears anywhere in the file, and no non-step section is emitted after the step sections. The per-step keying rule governs every `## Step N` section of `interfaces.md`.

## Per-step keying

Every top-level section of `interfaces.md` SHALL be a `## Step N` section with the integer N matching the corresponding step number in `tasks.md`. This keying ensures step lookups remain consistent across artifacts.
