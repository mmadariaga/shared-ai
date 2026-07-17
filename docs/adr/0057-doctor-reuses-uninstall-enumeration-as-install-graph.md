# ADR 0057: The doctor reuses uninstall-flow's enumeration as the install-graph source of truth

## Status

Accepted

## Context

`bin/doctor.js` must know each harness's expected destination files to classify them present / missing / unexpected, and to hash-compare them for the version file-diff (ADR 0056). That expected set is exactly "the files the installer would write" — the same set `bin/uninstall-flow.js` already reconstructs via `enumerateClaude`/`enumerateOpencode`/`enumerateCopilot`, which return `{ src, dest, editorBase }` entries and are exported (`module.exports`, `bin/uninstall-flow.js:267–282`). The install graph is otherwise implicit in `install-flow.js`'s imperative `copy()` calls; a symmetry test already locks the uninstall enumeration against install drift (ADR 0055). The doctor is a third consumer of the same graph.

## Decision

`bin/doctor.js` derives each harness's expected-file set by `require('./uninstall-flow')` and calling the exported `enumerate*` functions, rather than re-deriving the graph a third time or extracting a shared module now. Entries where `src === e.dest` (the stray-file entries `enumerateClaude` appends) are filtered out to obtain the true repo→destination mappings. Requiring the module is side-effect-free — `uninstall-flow.js`'s `main()` runs only under the CLI dispatcher, not on import.

## Alternatives Considered

- **Duplicate a third enumeration inside `doctor.js`** — rejected: a third hand-maintained copy of the install graph to drift; the repo already fought this problem once with the symmetry test (ADR 0055).
- **Extract a shared `bin/layout.js` consumed by install, uninstall, and doctor** — cleaner long-term and the recorded upgrade path, but it edits `install-flow.js` and `uninstall-flow.js`, expanding the blast radius beyond this change's Impact (new `bin/doctor.js` + one dispatcher branch + the marker write). Deferred.

## Consequences

- The doctor's expected-file set is guaranteed identical to the uninstall deletion set and, transitively, to the install destinations the symmetry test guards — one graph, three consumers.
- `bin/doctor.js` acquires a dependency on `bin/uninstall-flow.js`'s export surface (`enumerate*`, `sha256File`). A future `bin/layout.js` extraction would move those exports and require updating the doctor's `require`; the coupling is the accepted cost of not touching proven install/uninstall code now.
- Semantically odd ("doctor depends on uninstall"); the naming is a wart the deferred `bin/layout.js` rename resolves.

## Related

- `openspec/changes/add-sai-doctor/design.md` — Decision D2
- ADR 0055 — re-derive the uninstall deletion set and verify symmetry by test (the enumeration this ADR reuses)
- `openspec/changes/add-sai-doctor/specs/doctor-harness-inventory/spec.md` — "per-harness file inventory"
- `bin/uninstall-flow.js:267–282` — `module.exports` (`enumerate*`, `buildDeletionSet`, `sha256File`)
