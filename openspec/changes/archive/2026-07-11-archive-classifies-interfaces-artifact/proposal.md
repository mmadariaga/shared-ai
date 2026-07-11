## Why

The `sai-workflow` schema now defines ten artifacts (ADR 0022 added `interfaces` to the previous nine), but `sai/instructions/archive.md` still hard-codes the count as "nine" and enumerates only nine of them. The tenth artifact, `interfaces`, is intentionally optional (ADR 0023 — soft dependency with an explicit absent path), but the instruction's Classification Check provides no rule for an artifact outside the two named groups (CORE / AUDIT). The current behavior is therefore implementation-dependent: a literal reader that takes the CORE enumeration as the exhaustive list will ignore `interfaces` and archive fine (which is why the backfill case works today), while a more liberal reader that includes any not-`done` artifact in the CORE check may halt with a spurious Missing CORE diagnostic. The classification needs an explicit third group so the behavior is no longer implementation-dependent.

## What Changes

- Modify `sai/instructions/archive.md`:
  - Change "the nine `sai-workflow` artifacts" to "the ten `sai-workflow` artifacts".
  - Introduce a third classification group, **EXEMPT** (non-blocking, silent when present or absent): `interfaces`.
  - CORE stays as `proposal`, `specs`, `design`, `tasks`, `implementation`. AUDIT stays as `review`, `security`, `performance`, `accessibility`.
  - For non-backfilled changes, `interfaces` is never collected into either the CORE not-`done` set or the AUDIT missing set — it is exempt from both.
  - For backfilled changes, add `interfaces` to the explicit skip list together with `design`, `tasks`, `implementation` (robustness; `interfaces` has `requires: [tasks]` per ADR 0022, so a backfilled change cannot produce it).
- No change to the schema (`openspec/schemas/sai-workflow/schema.yaml`) — ADR 0023 deliberately keeps the absent path out of the schema.
- No change to the upstream `openspec-archive-change` skill (regenerated on `openspec update`).
- No change to the `commands/{claude,opencode,copilot}/sai-archive.*` wrappers (they only fetch).
- No new CLI flags, environment variables, or arguments.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sai-archive-soft-warn-audits`: extend the existing CORE / AUDIT partition to a three-group model (CORE / AUDIT / EXEMPT) with `interfaces` as the EXEMPT member, classified as non-blocking and silent when present or absent (per ADR 0023); rename the underlying requirement to `Artifact classification into CORE, AUDIT, and EXEMPT`; add a new requirement `Backfilled changes explicitly skip interfaces` that makes the backfill path explicit (and previously-coincidental) rather than relying on the transitive absence of `interfaces.md` from a backfilled change. The backfill case (proposal + specs → archive) remains unchanged.

## Impact

- `sai/instructions/archive.md` — the only file modified.
- `~/.config/opencode/sai/instructions/archive.md` — mirrored copy updated by the repo's existing mirror discipline; not edited by this change beyond what the repo update produces.
- Existing `openspec/changes/{name}/` consumers of `sai-archive`:
  - Backfilled changes (`proposal` + `specs` only) — no observable change; archive still proceeds.
  - Non-backfilled, full-set changes (all ten artifacts) — no observable change.
  - Non-backfilled changes that legitimately have no `interfaces.md` (e.g. changes authored before ADR 0022, or changes where `interfaces` has nothing to declare) — archive now proceeds silently regardless of how the executor reads the (previously ambiguous) instruction; this removes a latent ambiguity rather than reversing any specific observed behavior.
- No schema, wrapper, or skill files modified.

## Proposal Research Documentation

**Local files**:
- `C:\Projects\mine\shared-ai\sai\instructions\archive.md` (current Classification Check, including the "nine" wording and the backfill skip list)
- `C:\Projects\mine\shared-ai\openspec\specs\sai-archive-soft-warn-audits\spec.md` (the main capability spec being MODIFIED — currently states "the nine artifacts" and a two-group model that this change extends to ten artifacts and three groups)
- `C:\Projects\mine\shared-ai\openspec\schemas\sai-workflow\schema.yaml` (artifact graph — ten artifacts, `interfaces.requires: [tasks]`, `apply.requires: [tasks, implementation]`)
- `C:\Projects\mine\shared-ai\docs\adr\0022-interfaces-artifact-standalone-file.md` (rationale for the 10th artifact)
- `C:\Projects\mine\shared-ai\docs\adr\0023-interfaces-soft-dependency.md` (rationale for keeping `interfaces` optional / non-blocking)
- `C:\Projects\mine\shared-ai\openspec\changes\archive\2026-06-26-sai-archive-soft-warn-audits\specs\sai-archive-soft-warn-audits\spec.md` (archived copy of the spec at the time of merge — model for delta scope and structure)
- `C:\Projects\mine\shared-ai\openspec\changes\archive\2026-06-26-sai-archive-soft-warn-audits\proposal.md` (precedent proposal structure)
- `C:\Projects\mine\shared-ai\openspec\changes\archive\2026-07-09-design-emits-interfaces-artifact\proposal.md` (the change that registered `interfaces` and grew the graph from 9 → 10)
- `C:\Projects\mine\shared-ai\openspec\changes\consume-interfaces-artifact\specs\implement-respects-interfaces\spec.md` (consumer behavior; confirms the absent-`interfaces.md` path is intentional)

**External URLs**: None.

## Additional Notes

- The classification expands from a two-group model (CORE / AUDIT, established by `sai-archive-soft-warn-audits`) to a three-group model (CORE / AUDIT / EXEMPT). EXEMPT is strictly weaker than AUDIT: it produces no log line, no warning, and no prompt. It is reserved for artifacts whose absence is part of their contract (per ADR 0023), not just tolerated.
- The previous slice deliberately did not classify `interfaces` because at the time of `sai-archive-soft-warn-audits`, `interfaces` was registered in the schema (slice 1) but had not yet been wired into the pipeline. Slice 2 (`consume-interfaces-artifact`) wired it; this change closes the gap by giving the archive classification explicit awareness.
- The new behavior is best framed as removing a latent ambiguity, not as fixing a deterministic failure. Today, the instruction's CORE enumeration is named explicitly (proposal, specs, design, tasks, implementation), and the iteration in step 4 uses that named set — so a faithful literal executor ignores `interfaces` and archives fine, which is precisely why the backfill case works. A more liberal executor (e.g. one that pattern-matches on "any artifact not in the AUDIT list is CORE") may halt. After the change, `interfaces` is in the EXEMPT group and the result is independent of the executor's reading style.
- For the backfill path, this change adds a new explicit requirement (the previously-incidental behavior of "backfilled changes archive cleanly" now has a dedicated requirement, `Backfilled changes explicitly skip interfaces`, which is satisfiable either by extending the backfill skip list to include `interfaces` or by structuring the CORE check so that `interfaces` is excluded under any condition). The behavior itself is unchanged; what changes is that the spec no longer relies on the transitive absence of `interfaces.md` from a backfilled change.
