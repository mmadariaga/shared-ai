<!-- Format validator: node sai/tools/lint.js step-contract <file> -->

# Step Contract Format

Canonical structure for the per-step signatures and test assertions in `interfaces.md`. Design writes it; test authors and implementation steps consume it.

## Section structure

Each step that introduces a new/modified public interface or a testable assertion is represented as:

```
## Step N: <title>

**Interfaces**: <new or modified public signatures introduced in this step — function/method signatures, exported types, class or module public surface. Signatures only, no implementation body.>

**Test assertions**: <the exact assertions that verify this step — expected input → expected output/behavior — each anchored to a `specs/**/*.md` requirement or scenario by path.>
```

## Field rules

- **Section heading**: `## Step N: <title>` uses the corresponding step's integer from `tasks.md`.
- **Interfaces** contains signatures only, with no implementation body.
- **Test assertions** contains concrete expected inputs and outputs or behaviors, each citing a `specs/**/*.md` requirement or scenario by path.

## Omission rule

A step that introduces neither a new/modified public interface nor a testable assertion (e.g. a pure config or scaffolding step) is omitted entirely — do NOT emit an empty `## Step N` section. When every step introduces neither a new/modified public interface nor a testable assertion, `interfaces.md` carries exactly the sentinel `None — no step contracts` followed by a one-line reason naming why no step admits a contract — the sentinel is the sole content of the file in that case, keeping the design worker's exists-and-non-empty verification and the `change-overview` artifact's `requires: [interfaces]` dependency satisfiable for every designed change.

## Key constraints

- **Self-contained**: The signature plus its anchored assertions must be sufficient to author the step's tests without reading `implementation.md`, `design.md`, or source code.
- **No testing-stack section**: Do NOT add a testing-setup, stack, or `## Implementation Context` section to `interfaces.md`; the testing stack stays single-sourced in `tasks.md`'s `## Implementation Context`.
- **Keep out of tasks.md**: Signatures and assertions are the "detailed behavior" that `tasks.md`'s conciseness rule excludes. `tasks.md`'s `**Testing Strategy**` stays high-level *approach* prose (what kind of test, what surface it exercises); the concrete assertion values live only here. Never restate them into `tasks.md`.
- **Only step sections**: `interfaces.md` starts with its first `## Step N` section, or with the sole-content `None — no step contracts` sentinel when all steps are omitted. No `## Target State`, `### Architecture Snapshot`, `### File Manifest`, or other non-step section appears anywhere in the file.
