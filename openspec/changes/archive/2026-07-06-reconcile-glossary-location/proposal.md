## Why

`sai/instructions/spec.propose.md:25` tells the spec command to bootstrap `GLOSSARY.md` inside `openspec/changes/{name}/`, contradicting the canonical root location asserted in `glossary-format.md:74`, `README.md:234`, and `review.md:93` — a real feature just landed a `GLOSSARY.md` in the wrong place because of this split. This change makes the project-root path the single, unambiguous canonical location across every SAI instruction and active spec.

## What Changes

- Make **project root** the single explicit canonical location for `GLOSSARY.md` in `glossary-format.md`, and resolve the "Multi-context repos" section so it no longer contradicts the single-root mandate (the `GLOSSARY-MAP.md` mechanism is deferred/optional).
- Fix the spec command's write path: `spec.propose.md` MAY-modify list points to `./GLOSSARY.md` (project root) instead of `openspec/changes/{name}/GLOSSARY.md`.
- Make the reader paths explicit-at-root: confirm `review.md:93` (already "at repo root") and make `implement.md:211` resolve `GLOSSARY.md` at the project root rather than an unqualified "if it exists".
- Reconcile the active specs that describe the spec command's MAY-modify scope so `GLOSSARY.md` is listed as a project-root file (an explicit exception to the `openspec/changes/{name}/` subset): `artifact-only-scope` and `deduplicate-sai-2-design`.
- Clarify the documentation cross-links in `AGENTS.md:117-118` only if the change leaves them ambiguous about location (`README.md:234` already states root).
- **BREAKING** (one-way, no shim): the spec command will only read/write `GLOSSARY.md` at project root going forward. A downstream project that already bootstrapped a `GLOSSARY.md` inside a change folder must move it to root; the tooling will not look there.

## Capabilities

### New Capabilities
- `glossary-location`: `GLOSSARY.md` has one canonical home — the project root — read and written there by every SAI phase (spec bootstrap/append, implement reader, review auditor); the multi-context `GLOSSARY-MAP.md` mechanism is explicitly deferred and MUST NOT contradict the single-root rule.

### Modified Capabilities
- `artifact-only-scope`: the spec command's MAY-modify list SHALL identify `GLOSSARY.md` as a project-root file — an explicit exception to the "only `openspec/changes/{name}/` files" rule — not a file implied to live inside the change folder.
- `deduplicate-sai-2-design`: the "scope covers file mutations" scenario SHALL stop listing `GLOSSARY.md` as part of the `openspec/changes/{name}/` subset and instead list it as the project-root exception.

## Impact

- **Instruction files** (edited downstream by implement/apply, not in this spec phase): `sai/instructions/glossary-format.md`, `sai/instructions/spec.propose.md`, `sai/instructions/implement.md`, and (verify-only) `sai/instructions/review.md`.
- **Active specs**: `openspec/specs/artifact-only-scope/spec.md`, `openspec/specs/deduplicate-sai-2-design/spec.md`.
- **Docs**: `AGENTS.md` (lines 117-118) if ambiguous; `README.md` already correct.
- **Downstream consumers**: any project bootstrapped by a prior SAI version that placed `GLOSSARY.md` inside a change folder — one-way migration, user moves the file.

## Proposal Research Documentation

**Local files**: `sai/instructions/glossary-format.md`, `sai/instructions/spec.propose.md`, `sai/instructions/implement.md`, `sai/instructions/review.md`, `README.md`, `AGENTS.md`, `openspec/specs/artifact-only-scope/spec.md`, `openspec/specs/deduplicate-sai-2-design/spec.md`

**External URLs**: none

## Additional Notes

- Not in scope: migrating the in-flight `openspec/changes/{name}/GLOSSARY.md` that triggered this — that artifact is the user's call (move, delete, or keep as a historical note).
- Not touched: archived changes under `openspec/changes/archive/...`.
- Out of scope: designing the multi-context `GLOSSARY-MAP.md` mechanism (`glossary-format.md:63-68`). The canonical decision for this change is "single `GLOSSARY.md` at root, full stop"; the map mechanism is reduced to a deferred/optional note that must not contradict that rule.
- Tension to preserve: `GLOSSARY.md` at root sits *outside* `openspec/changes/{name}/`, so the artifact-only-scope specs must frame it as a named exception rather than silently widening the spec command's write scope to arbitrary root files.
