**Complexity**: high

> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Decision records can remain technically respected while their premises, referenced paths, or descendants disappear. The implemented `/sai-retire-docs` utility provides a bounded way to detect obsolete ADRs, DDRs, and related specifications without the cost or noise of a repository-wide semantic audit.

## What Changes

The repository adds a read-only, index-driven document-retirement utility that:

- Reads the ADR and DDR indexes in bounded order and considers only active entries before the corresponding historical section.
- Treats a missing or empty family index as absence of that family and does not infer candidates through recursive directory scanning.
- Correlates each active record with explicit relationships, named specifications, named paths, related change artifacts, and narrowly targeted current implementation evidence.
- Reviews requirement and scenario survival in related capability specifications.
- Classifies every active candidate as supported, superseded, orphaned, premise-missing, conflicting, or needs-review.
- Keeps malformed, dangling, unreadable, structurally invisible, ambiguous, and contradictory evidence active rather than treating it as obsolete.
- Does not run `openspec validate --specs`, does not repair indexes or specifications, and continues decision-record analysis when OpenSpec evidence is unavailable.
- Produces archival proposals only for eligible superseded, orphaned, or premise-missing candidates.
- Requires separate confirmation for each proposed candidate, then performs only exact-path reversible moves after collision checks, source-byte checks, final rereads, and reference-safety checks.
- Provides mirrored Claude Code and opencode wrappers, registry entries, launcher projections, installation coverage, and utility model-customization targets.

The bounded search may miss specifications without explicit relationships to an ADR or DDR. Ambiguous cases remain needs-review, and the command does not silently repair malformed inputs or indexes.

## Capabilities

### New Capabilities

- `retire-docs-analysis`: Bounded index discovery, evidence correlation, disposition classification, and confirmation-gated reversible archival for active ADRs, DDRs, and related specifications.

### Modified Capabilities

- `sai-1-command-inventory`: Both harness inventories include the new utility.
- `sai-command-naming`: The unnumbered utility uses the canonical `/sai-retire-docs` name in command and documentation surfaces.
- `command-wrappers`: Claude Code and opencode receive one canonical utility wrapper each.
- `sai-command-registry`: The universal command registry declares the new wrapper and fetch-before-execute route.
- `command-launcher-card`: The shared empty bootstrap is projected and tested for the new utility.
- `model-customization-menu`: The utility appears in derived utility target families and selection checklists.
- `decision-record-index-machinery`: The utility consumes bounded ADR and DDR index sections and preserves family-aware relationship handling.
- `adr-index-maintenance`: The utility consumes the canonical ADR and DDR index bindings without repairing their source structures.

## Impact

- `AGENTS.md` — documents the utility command, its prerequisite exemption, and safe-operations coverage.
- `README.md` — documents the command and utility model mapping.
- `bin/model-customization.js` — registers the utility family.
- `commands/claude/sai-retire-docs.md` — adds the Claude Code wrapper.
- `commands/opencode/sai-retire-docs.md` — adds the opencode wrapper.
- `fixtures/thin-command-wrappers-baseline.json` — records both thin wrapper projections.
- `sai/adapters/claude/boot.md` — routes the utility name through the Claude Code boot adapter.
- `sai/adapters/opencode/boot.md` — routes the utility name through the opencode boot adapter.
- `sai/commands/retire-docs/body.md` — defines bounded analysis and confirmation-gated archival.
- `sai/commands/retire-docs/command-bootstrap.md` — provides the shared empty utility bootstrap card.
- `skills/universal/sai-commands/SKILL.md` — registers the command.
- `test/command-launcher-card.test.js` — verifies launcher and bootstrap inventory.
- `test/design-coordinator-worker.test.js` — includes the utility in card inventory checks.
- `test/doctor-fetch-resolution.test.js` — verifies utility fetch projection.
- `test/doctor-harness-inventory.test.js` — verifies both harness inventories.
- `test/install-claude.test.js` — verifies Claude Code installation projection.
- `test/install-manifest.test.js` — verifies manifest utility projection.
- `test/install-opencode.test.js` — verifies opencode installation projection.
- `test/model-customization-menu.test.js` — verifies utility target enumeration.
- `test/model-customization-taxonomy.test.js` — verifies utility taxonomy membership.
- `test/verified-precondition-handback.test.js` — includes the utility card in hand-back contract coverage.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill.

## Proposal Research Documentation

**Local files:**

- `sai/commands/retire-docs/body.md` — authoritative bounded-analysis, classification, and archival procedure.
- `sai/commands/retire-docs/command-bootstrap.md` — shared utility bootstrap contract.
- `commands/claude/sai-retire-docs.md` — Claude Code wrapper and model declaration.
- `commands/opencode/sai-retire-docs.md` — opencode wrapper and model declaration.
- `sai/adapters/claude/boot.md` — Claude Code utility routing.
- `sai/adapters/opencode/boot.md` — opencode utility routing.
- `skills/universal/sai-commands/SKILL.md` — command registry entry and fetch-before-execute contract.
- `bin/model-customization.js` — utility target-family registration.
- `AGENTS.md` and `README.md` — repository command and harness documentation.
- `openspec/schemas/sai-workflow/schema.yaml` — proposal and capability-spec artifact contract.
- `sai/commands/spec/steps/validation.md` — complexity derivation rubric.
- `openspec/specs/sai-1-command-inventory/spec.md` — cross-harness inventory requirements.
- `openspec/specs/sai-command-naming/spec.md` — command naming requirements.
- `openspec/specs/command-wrappers/spec.md` — wrapper and model-routing requirements.
- `openspec/specs/sai-command-registry/spec.md` — command registry requirements.
- `openspec/specs/command-launcher-card/spec.md` — bootstrap and projection requirements.
- `openspec/specs/model-customization-menu/spec.md` — utility target requirements.
- `openspec/specs/decision-record-index-machinery/spec.md` — index and relationship requirements.
- `openspec/specs/adr-index-maintenance/spec.md` — ADR and DDR index maintenance requirements.
- `test/command-launcher-card.test.js` — launcher and bootstrap assertions.
- `test/doctor-fetch-resolution.test.js` and `test/doctor-harness-inventory.test.js` — projection and inventory assertions.
- `test/install-claude.test.js`, `test/install-opencode.test.js`, and `test/install-manifest.test.js` — installation assertions.
- `test/model-customization-menu.test.js` and `test/model-customization-taxonomy.test.js` — utility taxonomy assertions.
- `openspec/changes/rename-build-to-meta-build/proposal.md` — current proposal structure example.
- `openspec/changes/archive/2026-05-21-extract-sai-commands-shared-body/proposal.md` — archived proposal structure reference.

**External URLs:** None.

## Additional Notes

- The implementation is a main-session utility, not a routed worker phase; its command bootstrap is intentionally empty.
- The command is explicitly exempt from OpenSpec prerequisite checks and continues with decision-record evidence when related OpenSpec evidence is unavailable.
- Claude Code and opencode receive mirrored wrappers and boot routing while retaining harness-specific model declarations.
- The staged implementation updates launcher, doctor, installation, registry, fixture, and model-customization coverage for the new utility.
- The bounded evidence model intentionally allows false negatives for unlinked specifications and retains ambiguous cases as needs-review.
- These notes describe implementation facts and do not add normative requirements.
