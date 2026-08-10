# orphan-inline-caller-retirement Specification

## Purpose

TBD — capability introduced by the retired orphan-inline-callers change.

## Requirements

### Requirement: Orphaned phase-command bodies are retired

The five unreferenced inline phase-command bodies `sai/commands/sai-1-spec.md`, `sai/commands/sai-5-review.md`, `sai/commands/sai-6-security.md`, `sai/commands/sai-7-performance.md`, and `sai/commands/sai-8-accessibility.md` SHALL be deleted from the repository. The Claude Code and opencode wrappers SHALL NOT reference any of the five paths (they route through `sai/commands/{phase}/coordinator.md` and the neutral worker bindings), so the deletion SHALL change no observable behavior for either supported harness. Archived changes and ADRs are excluded from the active-reference audit and SHALL NOT be edited; their historical references to the five paths are retained as-is.

#### Scenario: Deleted bodies are absent from the working tree

- **WHEN** the repository working tree is inspected after the change
- **THEN** each of the five paths is absent

#### Scenario: Fresh installs receive no orphan body

- **WHEN** the recursive `sai-commands` manifest projection is expanded for Claude Code or opencode
- **THEN** none of the five deleted destinations appear in the expanded inventory
- **AND** no compatibility or replacement projection recreates them

### Requirement: Retirement records cover every historical content variant

`sai/install-manifest.json` SHALL register exactly one `retirements` record per deleted body, each with a stable unique `id`, a `destination` with class `sai` and the former `commands/<filename>` path, the harness allowlist `claude` and `opencode`, and a non-empty `managedHashes` array of lowercase SHA-256 digests. Each `managedHashes` array SHALL contain the SHA-256 digest of every distinct content variant that the file has ever contained, enumerated from the file's git history — one digest per historical blob reachable via `git log --follow` — including the digest of the content at the moment of deletion, so that install, doctor, and uninstall recognize any installed copy whose bytes match a historical managed variant. The deletion-time digest SHALL be computed during implementation from the file content at deletion; a digest fixed at proposal time is volatile and SHALL NOT be reused. Over-collection is intentional and harmless: a digest of a variant that no installed copy matches is inert, and a file that never varied historically contributes exactly one digest. The records SHALL follow the existing retirement record shape and SHALL be validated by the shared manifest expansion module.

#### Scenario: Install or update finds an exact historical managed copy

- **WHEN** install or update finds a deleted-body destination whose content matches a recorded historical managed hash
- **THEN** it SHALL remove that destination and SHALL NOT recreate it

#### Scenario: Uninstall finds an exact historical managed copy

- **WHEN** uninstall runs and finds a deleted-body destination whose content matches a recorded historical managed hash
- **THEN** it SHALL remove that destination under the same ownership safeguard

#### Scenario: Retired copy is modified or unrecognized

- **WHEN** install, update, doctor, or uninstall finds a deleted-body destination whose content matches no recorded historical managed hash
- **THEN** install, update, and uninstall SHALL preserve the file
- **AND** doctor SHALL report the unexpected retired file and identify manual cleanup as remediation

#### Scenario: Retirement inventory expands for both harnesses

- **WHEN** the shared manifest module expands `sai/install-manifest.json` for Claude Code or opencode
- **THEN** it SHALL return the five new deleted-body destinations with their registered managed SHA-256 hashes for that harness
- **AND** install, doctor, and uninstall SHALL consume that returned inventory without a separate hard-coded mapping

#### Scenario: Hash coverage is verified from git history

- **WHEN** the implementer enumerates every distinct content variant of a deleted body from its git history via `git log --follow`, hashing each historical blob
- **THEN** every enumerated digest SHALL appear in that body's retirement record `managedHashes` array, including the digest of the content at deletion

### Requirement: The recursive projection exclude list names no phantom source

The `sai-commands` projection's `exclude` array SHALL contain exactly `["spec/coordinator.md"]`. The entries `sai-2-design.md` and `sai-3-implement.md` SHALL be removed from the exclude array, because those files are already deleted and their existing retirement records own their cleanup — an exclude entry for a deleted file is a phantom that masks the retirement inventory as the source of truth.

#### Scenario: The exclude array is exact

- **WHEN** `sai/install-manifest.json` is loaded
- **THEN** the `sai-commands` projection `exclude` array equals exactly `["spec/coordinator.md"]`

#### Scenario: The surviving exclude entry keeps its dedicated projection

- **WHEN** the manifest is expanded for Claude Code or opencode
- **THEN** `spec/coordinator.md` is still delivered by its dedicated `routed-spec-coordinator` projection entry
- **AND** the recursive `sai-commands` projection still excludes it to avoid a duplicate destination

### Requirement: The retired-reference inventory registers the five bodies

`bin/orchestration-source-audit.js` `RETIRED_SOURCES` SHALL include the five deleted body paths. The audit SHALL otherwise retain its existing behavior: for maintained files outside `openspec/changes/`, this registration provides first-line detection only — the audit scans the first line of such files, so a reference placed later in a maintained file is not reported; broader scanning is a separate audit enhancement and is not part of this change. References under archived changes and ADRs remain excluded, and test files asserting absence remain exempt.

#### Scenario: A first-line maintained reference is flagged

- **WHEN** a maintained file's first line references one of the five deleted bodies
- **THEN** the active-reference audit SHALL report that file and reference

#### Scenario: Historical surfaces remain exempt

- **WHEN** the active-reference audit runs against archived changes and ADRs that reference the five bodies
- **THEN** it SHALL NOT report those historical references

### Requirement: Spec and accessibility suites stop asserting the orphaned bodies

`test/spec-coordinator-worker.test.js` and `test/accessibility-coordinator-worker.test.js` SHALL NOT read or assert the existence of any of the five deleted bodies. The contracts those suites cover — spec completion ownership staying outside the invocation core, and complete arguments reaching the accessibility invocation core — SHALL be re-anchored on the surviving routed surfaces (coordinator, invocation core, wrappers) and SHALL keep passing.

#### Scenario: The two re-anchored suites pass

- **WHEN** `node --test test/spec-coordinator-worker.test.js test/accessibility-coordinator-worker.test.js` runs
- **THEN** both suites pass
- **AND** neither suite contains any of the five deleted body paths

#### Scenario: The complete suite passes

- **WHEN** `node --test` runs the full test suite
- **THEN** it passes with no new failures beyond the pre-existing baseline (the stale model-pin assertions documented in SAI_LEARNINGS)
- **AND** no other suite references the five deleted body paths
