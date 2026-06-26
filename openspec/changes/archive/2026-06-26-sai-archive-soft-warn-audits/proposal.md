## Why

The `sai-workflow` schema defines nine artifacts (`proposal`, `specs`, `design`, `tasks`, `implementation`, `review`, `security`, `performance`, `accessibility`), but the upstream `openspec-archive-change` skill treats them as a single undifferentiated set: any artifact that is not `done` triggers an `AskUserQuestion` confirmation prompt. In non-interactive contexts (CI, headless agents, automated archiving) the prompt degrades to a hard stop; in interactive contexts it is noise for small, audit-irrelevant changes (e.g. documentation, refactors, dependency bumps) where the three audit artifacts add no value. The pipeline needs a native partition between must-have (CORE) and nice-to-have (AUDIT) artifacts so archive can stop on the former and soft-warn on the latter.

## What Changes

- Modify `sai/instructions/archive.md` to classify the nine `sai-workflow` artifacts into two groups: **CORE** (`proposal`, `specs`, `design`, `tasks`, `implementation`) and **AUDIT** (`review`, `security`, `performance`, `accessibility`).
- CORE artifacts keep the existing hard-stop behavior: any missing CORE artifact blocks archive.
- AUDIT artifacts become soft warnings: a missing AUDIT artifact is reported as an informational note and does not block the archive.
- The existing `- [ ]` task check in `implementation.md` remains a hard stop.
- No new CLI flags (e.g. `--force`, `--skip-audits`); the classification is native to the instruction file.
- No changes to the upstream `openspec-archive-change` skill (regenerated on `openspec update`).
- No changes to the `sai-workflow` schema (also regenerated).
- No changes to the `commands/{claude,opencode}/sai-archive.md` wrappers (they only fetch).

## Capabilities

### New Capabilities

- `sai-archive-soft-warn-audits`: partition the nine `sai-workflow` artifacts into CORE and AUDIT, block archive on missing CORE, soft-warn on missing AUDIT, preserve the existing incomplete-tasks hard stop.

### Modified Capabilities

None.

## Impact

- `sai/instructions/archive.md` — the only file modified.
- `~/.config/opencode/sai/instructions/archive.md` — mirrored copy updated by the repo's existing mirror discipline (the user install path). Not edited by this change beyond what the repo update produces.
- All `openspec/changes/{name}/` consumers of `sai-archive` gain the new behavior on next run; existing changes with full CORE+complete tasks archive unchanged.

## Proposal Research Documentation

**Local files**:
- `C:\Users\mikel.madariaga\.config\opencode\sai\instructions\archive.md` (current behavior, source of the incomplete-tasks check)
- `C:\Projects\mine\shared-ai\.claude\skills\openspec-archive-change\SKILL.md` (upstream archive skill — step 2 confirmed as the AskUserQuestion trigger)
- `C:\Projects\mine\shared-ai\.opencode\skills\openspec-archive-change\SKILL.md` (mirror)
- `C:\Projects\mine\shared-ai\openspec\schemas\sai-workflow\schema.yaml` (nine-artifact list)
- `C:\Users\mikel.madariaga\.config\opencode\sai\commands\sai-archive.md` (wrapper that fetches archive.md before the skill)
- `C:\Users\mikel.madariaga\.config\opencode\commands\sai-archive.md` (claude/opencode wrapper that only fetches the command body)

**External URLs**: None.

## Additional Notes

- The instruction file is loaded by `sai-archive` BEFORE the upstream skill, so adding a pre-step that classifies artifacts and either halts (CORE missing) or filters them out of the upstream step 2 prompt (AUDIT missing) is the natural override seam — no skill or schema changes required.
- A `> N/A — change has no <surface>` justification in an AUDIT artifact is already a documented outcome (security/performance/accessibility templates explicitly support it). The soft-warn policy aligns with that intent: a documented "not applicable" is equivalent to "done with no findings", so neither should block archive.
- The current archive.md pre-step already runs before the upstream skill; the new pre-step is a peer of it, not a replacement.
