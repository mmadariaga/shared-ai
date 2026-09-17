# Terminal Lifecycle

## Final sweep and terminal lifecycle

The coordinator enters this section only after the Step loop, every applicable Human Verification gate, every required per-Step commit gate, and the existing appendices have completed. A run that halts before this Final sweep performs neither learnings promotion nor terminal documentation evaluation.
The retired monolithic apply instruction is not an executable source.

### Terminal functional review

The coordinator performs exactly one terminal functional review after the Step loop, every applicable Human Verification gate, every required per-Step commit gate, and the existing appendices have completed, and before the Final sweep (E1). The review is coordinator-owned read-only empirical re-verification of the aggregated Human checks — an extension of Coordinator Checklist Execution with no writes, no worker dispatch, no RED/GREEN cycle, no recovery slot, and no extra commit (I2, E5).

Coverage is the aggregated Human `- [ ]` checkboxes from `openspec/changes/{change-name}/implementation.md` across all Steps, including `*Deferred from Step N*` blocks; italic parenthetical notes contribute nothing and Steps without Human checks contribute nothing (E4). Automated checks are not re-run (E2). Re-exercise each Human check empirically against current working-tree state where a runnable surface exists; assign exactly one verdict per check — `pass`, `fail`, or `unverifiable` with a one-line reason — where `unverifiable` means the check needs human senses with no runnable surface to re-exercise (E3).

Lax semantics: findings are non-blocking warnings only — the entry completes even with findings, the Final sweep passes independently of them, and there is no auto-fix, no recovery continuation, and no selector (E5, I4, I5). The report is screen-only with no artifact write: print each `fail`/`unverifiable` check with its reason plus one recommendation line in the user's input language (Spanish when the user writes Spanish, English fallback), preceding the unchanged completion literal (I4, I5). Warnings are ephemeral — a re-entry re-derives them from the current `implementation.md` and previous findings are lost (E7). Under fast-track the fixed print order is findings, then the deferred HV list, then the literal (E6, I6). The run-start Step Projection MAY carry exactly one coordinator-derived synthetic terminal entry for this review (no `#### Step N:` heading, no checkbox, no dispatch); see `sai/commands/apply/coordinator.md` § Run-Start Step Projection (I1).

### Final sweep

Scan the complete `openspec/changes/{change-name}/implementation.md` file and verify that every checkbox that should be checked is `[x]`. Report any unchecked item and do not enter the terminal lifecycle until the sweep passes. This is the final checkbox sweep, not a new Step dispatch.

### Learnings Promotion Pass

After a passing Final sweep, perform exactly one learnings promotion pass for the run. Read the complete `## Appendix: Plan vs Final Implementation` from `implementation.md` and use the coordinator's field-6 technical-learnings memory only as a supplementary source. Do not promote per Step, do not promote from a successful Step with no deviation, and do not dispatch promotion to RED or GREEN.

For each candidate, apply only the single SAI learnings classification: the candidate must name a repository-level artifact rather than a symbol or file introduced or renamed by this change. Use the named artifact as the section key, supersede key, and reader anchor; use the candidate's `**Final:**` value as what works instead. Write only the root `SAI_LEARNINGS.md` and preserve its four-section format. If there is no qualifying entry and the file is absent, do not create an empty file. If the promotion writes the file, disclose the root path, entries added and superseded by section, and any contradicted pre-seeded keys.

### Terminal documentation evaluation

Immediately after the single promotion pass, evaluate the terminal documentation set from terminal working-tree state with tracked and untracked paths visible. The eligible set is closed:

- changed paths under `docs/**`;
- root `SAI_LEARNINGS.md` only when this run's promotion pass wrote it; and
- changed root `GLOSSARY.md`, whether tracked-modified or untracked.

The terminal set is proposed whenever at least one eligible path exists, even when promotion produced no qualifying entry. When none of these conditions holds, propose no terminal documentation commit and ask no terminal authorization question. never resolve `GLOSSARY.md` from `openspec/changes/{change-name}`. `openspec/changes/**`, `implementation.md`, unrelated working-tree paths, the changed-files union, and every per-Step field-8 add-list remain outside this set.

### Terminal visibility listing

Before proposing a terminal documentation commit message and before authorization, print a non-mutating visibility listing. Show the exact eligible paths under `Will be committed` and every working-tree path outside the closed set under `Will NOT be committed`. The preview does not stage, unstage, or otherwise mutate the Git index, does not depend on a Step number or worker report, and does not use a broad working-tree sweep.
The visibility listing is followed by the proposed commit message and then authorization; the preview remains non-mutating.

### Terminal authorization and commit

Apply `sai/policies/commit-rules.md` before composing the message. The proposed message describes only the terminal documentation paths and staged hunks. Keep terminal staging separate from per-Step field-8 staging and add-lists. After authorization, stage exactly the closed terminal set; SHALL NOT use `git add -A`, a broad staging fallback, or any path under `openspec/changes/{change-name}/`.

When `session_commit_authorized` is inactive, present the native closed-choice options `yes (Recommended)` / `no` / `Allow on this session` for this final gate — the same option set as every commit-authorization gate in the pipeline: only explicit `yes` (or an `Allow on this session` selection, which additionally activates `session_commit_authorized` per its definition in `sai/commands/apply/coordinator.md`) authorizes `git add` and `git commit`. An off-option reply or silence is NOT a decline: re-present the same ask unchanged through the native picker per the invalid-input rule in `@sai/policies/remember.md`; only explicit `no` declines. The session-scoped grant and its boundaries follow `## Authorization Scope` in `sai/policies/commit-rules.md`. When the session flag is already active, including fast-track pre-activation, skip only this authorization ask; still print the visibility listing and proposed message before staging and committing. On decline, leave eligible files in the working tree, describe what remains uncommitted, and continue to MANDATORY STOP without retrying.

### MANDATORY STOP

After the terminal documentation commit succeeds, or after a no-op terminal evaluation or declined terminal authorization, invoke the existing standalone or chained `terminal_navigation` action. The final standalone completion literal remains owned by `invocation.md`; do not continue into another implementation Step from this section.
