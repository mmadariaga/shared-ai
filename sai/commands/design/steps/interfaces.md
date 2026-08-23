# Design Step — Interfaces

Active step: interfaces. Write `interfaces.md` and verify it, then report the `interfaces` progress event per the worker contract.

## Generate interfaces.md

Write to `openspec/changes/$ARGUMENTS/interfaces.md`.

`interfaces.md` is the per-step **contract** — the new/modified public signatures plus the exact assertions a test author needs — kept in a separate file from `tasks.md` so it is consumable without the implementation body. Derive it from the **same fresh step decomposition** as `tasks.md`, in the same run. Regenerate it wholesale every run; there is NO cross-run preservation path at the design stage (unlike `implementation.md`, which the implementation phase preserves byte-for-byte), so its `## Step N` keys always match the current `tasks.md` and cannot desync.

`interfaces.md` SHALL admit **no** leading non-`Step N` top-level section: the `## Target State` section and its `### Architecture Snapshot` and `### File Manifest` subsections are emitted in `design.md` (see the design step) and SHALL NOT be emitted in `interfaces.md`. Every top-level section of `interfaces.md` SHALL be a `## Step N` section, with exactly one admitted exception: when every step introduces neither a new/modified public interface nor a testable assertion, `interfaces.md` carries exactly the sentinel `None — no step contracts` followed by a one-line reason naming why no step admits a contract — the sentinel is the sole content of the file in that case, keeping the design worker's exists-and-non-empty verification and the `change-overview` artifact's `requires: [interfaces]` dependency satisfiable for every designed change.

Structure — one section per step that introduces a new/modified public interface or a testable assertion, keyed by the same integer `## Step N` as `tasks.md`:

    ## Step N: <title>

    **Interfaces**: <new or modified public signatures introduced in this step — function/method signatures, exported types, class or module public surface. Signatures only, no implementation body.>

    **Test assertions**: <the exact assertions that verify this step — expected input → expected output/behavior — each anchored to a `specs/**/*.md` requirement or scenario by path.>

Rules:
- **Omit steps with no interface surface.** A step that introduces neither a new/modified public interface nor a testable assertion (e.g. a pure config or scaffolding step) is omitted entirely — do NOT emit an empty `## Step N` section.
- **Keep signatures and assertions OUT of `tasks.md`.** They are the "detailed behavior" that `tasks.md`'s conciseness rule excludes. `tasks.md`'s `**Testing Strategy**` stays high-level *approach* prose (what kind of test, what surface it exercises); the concrete assertion values live only here. Never restate them into `tasks.md`.
- **No testing-stack section.** Do NOT add a testing-setup, stack, or `## Implementation Context` section to `interfaces.md`; the testing stack stays single-sourced in `tasks.md`'s `## Implementation Context`.
- **Self-contained.** The signature plus its anchored assertions must be sufficient to author the step's tests without reading `implementation.md`, `design.md`, or source code.
- **No non-`Step N` top-level section.** `interfaces.md` begins directly with its first `## Step N` section (or the `None — no step contracts` sentinel); no `## Target State` section and no `### Architecture Snapshot` or `### File Manifest` subsection appears anywhere in the file, and no non-step section is emitted after the step sections. The per-step keying rule governs every `## Step N` section of `interfaces.md`.
