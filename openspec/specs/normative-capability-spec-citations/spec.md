# normative-capability-spec-citations Specification

## Purpose
TBD - created by archiving change repair-dead-cross-references. Update Purpose after archive.
## Requirements
### Requirement: main-spec citations resolve to existing files and current line numbers

Citations inside main capability specs SHALL resolve to existing files and current line numbers, or name stable anchors that do not drift with file edits.

#### Scenario: Checked-in template citation for dispatcher bindings

- **WHEN** a spec cites a dispatcher binding location
- **THEN** the citation names `sai/orchestration/workers/bindings/claude/worker-template.md:24`, the checked-in template, not per-phase projections absent from the repository

#### Scenario: Worker contract citation for routed workers

- **WHEN** a spec cites a routed worker's contract and dispatch location
- **THEN** the citation names the worker kind and contract file path (`sai/commands/design/worker.md:98-100`), not instance-specific paths

#### Scenario: Manifest entry id citation

- **WHEN** a spec cites the install-manifest projection that delivers a policy
- **THEN** the citation names the entry id (`sai-policies` entry in `sai/install-manifest.json`), not a line number, because manifest line numbers shift with roster changes

#### Scenario: Archived change citation to existing artifact

- **WHEN** a spec cites an artifact within an archived change
- **THEN** the citation names a path that exists in the archived change (e.g. `openspec/changes/archive/2026-08-06-retire-inline-harness-model/proposal.md:25`), not a path that never existed in that change

