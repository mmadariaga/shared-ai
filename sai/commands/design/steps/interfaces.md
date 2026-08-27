# Design Step — Interfaces

Active step: interfaces. Write `interfaces.md` and verify it, then report the `interfaces` progress event per the worker contract.

## Generate interfaces.md

Write to `openspec/changes/{resolved_change_name}/interfaces.md`.

`interfaces.md` is the per-step **contract** — the new/modified public signatures plus the exact assertions a test author needs — kept in a separate file from `tasks.md` so it is consumable without the implementation body. Derive it from the **same fresh step decomposition** as `tasks.md`, in the same run. Regenerate it wholesale every run; there is NO cross-run preservation path at the design stage (unlike `implementation.md`, which the implementation phase preserves byte-for-byte), so its `## Step N` keys always match the current `tasks.md` and cannot desync.

`interfaces.md` SHALL admit **no** leading non-`Step N` top-level section: the `## Target State` section and its `### Architecture Snapshot` and `### File Manifest` subsections are emitted in `design.md` (see the design step) and SHALL NOT be emitted in `interfaces.md`. Every top-level section of `interfaces.md` SHALL be a `## Step N` section.

Structure — emit one section per step that introduces a new/modified public interface or a testable assertion, keyed by the same integer as `tasks.md`, following the format and rules defined in `@sai/policies/step-contract-format.md`:

Fetch @sai/policies/step-contract-format.md

The per-step section structure, field definitions, omission rule (including the sentinel `None — no step contracts` rule), anchoring rule, and all key constraints are specified in that policy file and SHALL be applied as written.
