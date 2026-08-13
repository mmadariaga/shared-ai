## Target State

<!-- The finished shape the change converges on, as ONE concrete artifact, emitted as the FIRST section of design.md —
     before every other design section. For code changes: the final payload / public signature / schema / file layout /
     config shape. For prose/instruction/doc changes: the final section + field structure of each document touched.
     Must be readable on its own, without the step sections. Write None + a one-line reason if no finished shape is
     expressible. Projected into change-overview.md by the overview generator — never authored there.
     Authoritative contract: sai/commands/design/instructions.md `### Target State (authored first in design.md)`. -->

### Architecture Snapshot

<!-- Inventory planned public classes, interfaces, and methods with project-root-relative paths.
     Show relevant relationships or execution flows with concise portable ASCII notation.
     Do not emit absolute paths. If no public surfaces are planned, write exactly:
     None — no planned public surfaces
     followed by a one-line reason; do not invent file-level entries as substitutes. -->

### File Manifest

<!-- The flat, git-status-style list of every file the change creates, modifies, deletes, or renames,
     path-sorted with step attribution, derived by the deterministic net fold over the per-step
     `**Files Affected**` entries of tasks.md (see sai/commands/design/instructions.md). If the fold produces
     no lines, write exactly:
     None — no files affected
     followed by a one-line reason. This persisted manifest is authoritative; the change-overview
     generator recomputes the fold and validates it against this subsection. -->

## Context

<!-- Background, current state, constraints. Why does this design exist? -->

## Goals / Non-Goals

**Goals:**
<!-- What this design achieves -->

**Non-Goals:**
<!-- What is explicitly out of scope -->

## Decisions

<!-- For each key decision, evaluate the three ADR/DDR criteria:
     1. Hard to reverse — would changing later be costly?
     2. Surprising without context — would a future reader ask "why did they do this?"
     3. Real trade-off — were genuine alternatives available?
     If all three apply, give the full treatment below (Alternatives considered + Rationale).
     Otherwise the decision is still documented, but brief-only (drop the Alternatives block). -->

### D1: <!-- Decision title -->
**Provenance**: <!-- user | codebase-forced | derived — the highest-precedence applicable token -->
**Decision**: <!-- What was decided -->
**Rationale**: <!-- Why this approach over the alternatives -->
**Alternatives considered**:
- <!-- Alternative A: why rejected -->
- <!-- Alternative B: why rejected -->

**ADR check**: <!-- Which of the three criteria apply and why → justifies documenting this decision -->
**Record family**: <!-- adr | ddr — resolved by the ordered routing test (a decision encoding a domain invariant is ddr; otherwise adr); emitted when all three ADR/DDR criteria apply -->

## Endpoint Map

<!-- List new or modified API endpoints / CLI commands / event types introduced by this change.
     Leave empty or remove section if no public interface is added or changed. -->

| Method | Path / Command | Description |
|--------|---------------|-------------|
| <!-- GET/POST/... --> | <!-- /api/... --> | <!-- what it does --> |

## Risks / Trade-offs

<!-- [Risk description] (**Verify-first**: Step N) → Mitigation -->
<!-- The (**Verify-first**: Step N) marker is optional — include it only when the risk gates a specific step; omit it otherwise. -->

## Migration Plan

<!-- Steps to deploy safely. Rollback strategy. Skip if not applicable. -->

## Open Questions

<!-- Outstanding unknowns or decisions deferred to implementation. -->

## Deferred

<!-- Decisions deliberately postponed, each with: a concrete cost of postponing (what accumulates or must be reworked later) + a recommendation. Non-blocking — NOT an Open Question. Write None if nothing is deferred. -->

## Manual Verification

<!-- Closing section (always last). Checks that are cheap by hand and expensive to automate: generated-artifact drift, end-to-end smoke. Each item names what to check and what a correct result looks like — not "verify it works". Write None + a one-line reason if no manual check applies. -->
