# ADR 0055: Re-derive the uninstall deletion set and verify symmetry by test

## Status

Accepted

## Context

`npx shared-ai uninstall` must delete exactly the user-global files the installer wrote. The three install functions in `bin/install-flow.js` (`installClaude`, `installOpencode`, `installCopilot`) perform `copy()` as a side-effect and return nothing — they do not expose their destination list. The OS-aware base-path constants (`CLAUDE_BASE`, `OPENCODE_BASE`, `COPILOT_PROMPTS_BASE`, `COPILOT_SKILLS_BASE`, `COPILOT_AGENTS_BASE`, `COPILOT_SAI_BASE`) are not exported, and each editor's skill list is a hardcoded sequence of `copy()` calls rather than a shared array. The uninstall therefore has to reproduce the same source→destination mapping without a persisted install manifest (a manifest was rejected in the proposal).

## Decision

`bin/uninstall-flow.js` re-derives the deletion set by mirroring each `install*` function's source→destination mapping, reusing the exported `listMdFiles`/`listMdFilesRecursive` walkers. Two inputs are duplicated (the mapping shape and the per-editor skill lists) and one is single-sourced: the six base-path constants are added to `install-flow.js`'s `module.exports` (additive only — no `install*` logic change) and imported by the uninstall. A `destBase`-injected symmetry test locks the duplication: it runs each real `install*(tmpBase…)`, walks the temp tree for the files actually written, and asserts the uninstall enumerator's `dest` set equals that set exactly, plus `sha256(src) === sha256(dest)` for every enumerated pair.

## Alternatives Considered

- **Refactor `install-flow.js` into a shared pure enumerator (`enumerate* → {src,dest}[]`) consumed by both copy and delete** — strongest structural symmetry, but refactors proven install code (regression surface) and expands the blast radius well beyond the change's Impact. Rejected in favor of additive-export + verify-by-test.
- **Persisted install manifest (`~/.config/shared-ai/install-manifest.json`)** — rejected in the proposal: its exact-merge benefit evaporates once config merges are left in place, its file-list benefit is derivable from code, and it adds versioned on-disk state needing migration and atomic writes.
- **Duplicate the base-path resolution too (touch `install-flow.js` not at all)** — rejected: a `destBase`-injected test cannot catch a divergence in the *default* production base computation, making the most safety-critical input (which directories we delete from) the one thing unguarded.

## Consequences

- The deletion set is guaranteed equal to the install destinations by a CI-caught condition; adding a file to an `install*` function without mirroring it in the enumerator fails the symmetry test.
- The only change to `install-flow.js` is an additive export block; its `install*` behavior is untouched, so the install path is behavior-neutral.
- The change's file-touch set slightly exceeds the proposal's Impact list (which named `install-flow.js` unmodified); this is export-only, changes no requirement, and does not amend `proposal.md` or `specs/**`.

## Related

- `openspec/changes/add-shared-ai-uninstall/design.md` — Decisions D1, D2
- `openspec/changes/add-shared-ai-uninstall/specs/shared-ai-uninstall/spec.md` — "symmetric deletion-set enumeration"
- `bin/install-flow.js` — `installClaude`/`installOpencode`/`installCopilot`, base constants, `listMdFiles`/`listMdFilesRecursive`
