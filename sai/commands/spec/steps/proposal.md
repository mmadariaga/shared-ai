# Spec Step — Proposal

Active step: proposal. Write the change proposal, then report the `proposal` progress event per the worker contract.

Rules originating here: Required Documentation discipline.

Fetch @skills/openspec-propose/SKILL.md and follow those instructions exactly.

Set `$ARGUMENTS` to the resolved request from the invocation envelope, then write `openspec/changes/{name}/proposal.md` per that skill's template. Generate ONLY `proposal.md` in this step — `specs/**/*.md` are written by the next step; `design.md` and `tasks.md` are never generated in this phase. The allowed path is governed by the `SpecWriteSurface` in `@sai/policies/spec-phase-contract.md`.

## Required Documentation discipline

When the skill template asks you to fill an implementation-context section (or equivalent), list ONLY the specific docs that downstream phases must read — not entire skill indexes. Identify exact sub-files or sections with line ranges when only a portion applies.

The Complexity Derivation Rubric is NOT applied in this step: the complexity token is derived later, during the validation step, once the specs exist.
