# worker-binding-proxy-retirement Specification

## Purpose
TBD

## Requirements

### Requirement: Active wrappers load direct worker bindings

The 17 active Claude Code and opencode wrapper references that currently fetch one-line worker proxy skills SHALL instead fetch the corresponding direct installed binding path under `@sai/orchestration/workers/bindings/`. The phase mapping SHALL be `spec-worker.md`, `design-worker.md`, `implementation-worker.md`, `review-worker.md`, `security-worker.md`, `performance-worker.md`, or `accessibility-worker.md` as applicable.

#### Scenario: All active proxy references are inlined

- **WHEN** the active wrapper files are inspected
- **THEN** the eight Claude Code occurrences in `commands/claude/sai-1-spec.md`, `commands/claude/sai-2-design.md`, `commands/claude/sai-3-implement.md`, `commands/claude/sai-5-review.md`, `commands/claude/sai-6-security.md`, `commands/claude/sai-7-performance.md`, `commands/claude/sai-8-accessibility.md`, and `commands/claude/sai-explore.md` fetch direct binding paths
- **AND** the nine opencode occurrences in `commands/opencode/sai-1-spec.md`, `commands/opencode/sai-2-design.md`, `commands/opencode/sai-3-implement.md`, `commands/opencode/sai-5-review.md`, `commands/opencode/sai-6-security.md`, `commands/opencode/sai-7-performance.md`, `commands/opencode/sai-8-accessibility.md`, and the two worker references in `commands/opencode/sai-explore.md` fetch direct binding paths
- **AND** none of those 17 occurrences fetches `@skills/sai-*-worker/SKILL.md`

#### Scenario: Direct binding loading preserves worker behavior

- **WHEN** a wrapper resolves a direct binding path
- **THEN** it receives the same harness-specific binding content that the proxy previously forwarded
- **AND** worker dispatch, same-worker continuation, recovery, and permission behavior are unchanged

#### Scenario: Doctor resolves active direct bindings through the non-skill branch

- **WHEN** doctor inspects the installed active Claude Code and opencode wrappers after proxy references are replaced
- **THEN** all 17 direct binding references are processed as non-skill fetch references and resolve to installed neutral binding destinations
- **AND** no reference triggers a retired proxy-skill lookup or a dangling-fetch error

### Requirement: Proxy skill projections are retired safely

The install manifest SHALL stop projecting the seven Claude Code and seven opencode one-line worker proxy skills, and SHALL register their 14 installed destinations with the existing hash-based retirement mechanism. Installer cleanup, doctor, and uninstall SHALL consume those retirement records with the same hash classification. Retirement SHALL remove only recognized managed historical bytes and SHALL preserve modified or unknown user-owned files.

#### Scenario: Fresh installations omit proxy skills

- **WHEN** a fresh Claude Code or opencode installation expands the manifest
- **THEN** no `sai-1-spec-proposal-worker`, `sai-2-design-worker`, `sai-3-implementation-worker`, `sai-5-review-worker`, `sai-6-security-worker`, `sai-7-performance-worker`, or `sai-8-accessibility-worker` proxy skill destination is created
- **AND** the corresponding direct worker binding projection remains installed

#### Scenario: Existing managed proxy skills are retired without deleting user content

- **WHEN** an installed proxy skill destination contains a previously managed hash
- **THEN** the retirement path removes that proxy skill file
- **AND** when the same destination contains modified or unknown content, the retirement path preserves it
- **AND** no unrelated skill, binding, agent, or configuration file is removed

#### Scenario: Proxy skill retirement records retain fail-safe validation

- **WHEN** the manifest validates or expands a proxy skill retirement record
- **THEN** the `skills` destination class is accepted and an unknown destination class is rejected
- **AND** duplicate retirement IDs or destinations, invalid harnesses, malformed SHA-256 digests, and duplicate digests remain invalid

#### Scenario: Install and uninstall share the retirement hash gate

- **WHEN** installer cleanup or guarded uninstall evaluates the same proxy skill destination
- **THEN** each consumer deletes bytes matching a registered historical hash
- **AND** each consumer preserves modified or unknown bytes

#### Scenario: Doctor reports a preserved unknown proxy skill as retired

- **WHEN** doctor inventories a proxy skill destination whose bytes do not match a registered historical hash
- **THEN** it reports an unrecognized retired-file warning for that destination
- **AND** it does not classify the destination as a missing active projection or a generic unexpected file
- **AND** it leaves the destination bytes unchanged

#### Scenario: Copilot projections remain unchanged

- **WHEN** the retirement manifest is expanded for Copilot
- **THEN** it contains no proxy skill retirement or routed worker-binding projection
- **AND** Copilot continues to use its existing inline path

### Requirement: Obsolete proxy skill sources are deleted

The repository SHALL no longer contain the seven Claude Code or seven opencode one-line worker proxy skill source files under `skills/claude/` and `skills/opencode/`. The surviving harness-specific binding sources and all managed worker agent definitions SHALL remain.

#### Scenario: Source tree contains no retired proxy skills

- **WHEN** the repository source tree and install manifest are inspected after the change
- **THEN** the retired proxy source files are absent
- **AND** no manifest projection or active wrapper reference requires one of those source files
- **AND** active installation guidance and repository structure documentation contain no copy or ownership instruction for one of those source files

#### Scenario: Surviving worker sources remain available

- **WHEN** the retired proxy source files are removed
- **THEN** the seven Claude and seven opencode binding sources under `sai/orchestration/workers/bindings/` remain present
- **AND** the existing Claude agent definitions and opencode registration sources remain present and unchanged
