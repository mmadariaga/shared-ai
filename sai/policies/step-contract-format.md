<!-- Format validator: node sai/tools/lint.js step-contract <file> -->

# Step Contract Format

Canonical structure for the per-step signatures and test assertions in `interfaces.md`. Design writes it; test authors and implementation steps consume it.

## Section structure

Each step that introduces a new/modified public interface or a testable assertion is represented as:

```
## Step N: <title>

**Interfaces**: <new or modified public signatures introduced in this step — function/method signatures, exported types, class or module public surface. Signatures only, no implementation body.>

**Test assertions**:
- [smoke-test] <an assertion marked as smoke-test — expected input → expected output/behavior, anchored to a `specs/**/*.md` requirement or scenario by path, or to a `proposal.md` statement when the change declares `skip_specs`>
- <an unmarked assertion, same shape>
```

## Field rules

- **Section heading**: `## Step N: <title>` uses the corresponding step's integer from `tasks.md`.
- **Interfaces** contains signatures only, with no implementation body.
- **Test assertions** is a Markdown list with one assertion per item. Each item holds concrete expected inputs and outputs or behaviors and cites a `specs/**/*.md` requirement or scenario by path. A change whose `.openspec.yaml` sets `skip_specs: true` has no spec file: each assertion cites a statement of `proposal.md` instead, by its section heading and the statement's wording.
- **Smoke-test mark**: an item may start with the prefix `[smoke-test]`. The mark means the assertion guards critical behavior: its failure leaves the system useless for its main purpose, or the behavior charges, pays, moves, or computes money. An item that meets neither condition carries no mark. This policy is the single source of the mark and its criterion.
- **Earlier prose form**: a `**Test assertions**` field written as one prose paragraph, with no list, stays valid and carries no mark.

## Omission rule

A step that introduces neither a new/modified public interface nor a testable assertion (e.g. a pure config or scaffolding step) is omitted entirely — do NOT emit an empty `## Step N` section. When every step introduces neither a new/modified public interface nor a testable assertion, `interfaces.md` carries exactly the sentinel `None — no step contracts` followed by a one-line reason naming why no step admits a contract — the sentinel is the sole content of the file in that case, keeping the design worker's exists-and-non-empty verification and the `change-overview` artifact's `requires: [interfaces]` dependency satisfiable for every designed change.

## Key constraints

- **Self-contained**: The signature plus its anchored assertions must be sufficient to author the step's tests without reading `design.md` or source code.
- **No testing-setup section**: Do NOT add a testing-setup or `## Implementation Context` section to `interfaces.md`; the test command stays single-sourced in `tasks.md`'s `## Implementation Context`.
- **Keep out of tasks.md**: Signatures and assertions are the "detailed behavior" that `tasks.md`'s conciseness rule excludes. `tasks.md`'s `**Testing Strategy**` stays high-level *approach* prose (what kind of test, what surface it exercises); the concrete assertion values live only here. Never restate them into `tasks.md`.
- **Only step sections**: `interfaces.md` starts with its first `## Step N` section, or with the sole-content `None — no step contracts` sentinel when all steps are omitted. No `## Target State`, `### File Manifest`, or other non-step section appears anywhere in the file.
