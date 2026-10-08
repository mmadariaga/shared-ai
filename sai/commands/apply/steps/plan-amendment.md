# Apply Step — Plan Amendment

Loaded only when apply finds a plan defect: the work is right and a planning artifact is wrong. The plan stays the authority, and the coordinator corrects it. The file comparison of `verify` and `close` is a detector, not a gate: its finding ends here, in an amendment, never in a worker retry and never in a closed Step with the deviation merely recorded.

**Amendable artifacts.** `tasks.md`, `interfaces.md`, `proposal.md`, `design.md` of the active change. Delta specs, `change-overview.md`, `.openspec.yaml` stay out of reach. `implementation.md` changes only through the Appendix entry below and § Plan-artifact repair of `coordinator.md`.

## Triggers

Each trigger names the evidence that qualifies it. Anything else follows its ordinary handling.

- **Run start.** `preflight` errors whose file is `tasks.md` and whose reason starts `Files Affected omits a path the plan names`. The amendment precedes the baseline capture; other preflight errors stop the run.
- **Verify.** The Step's commands pass, `failures`, `unreported`, `only_in_subagent`, and `preservation_errors` are empty, and every `out_of_allowed` path is a production file the worker reported in field 8 that the Step needs and neither `implementation.md` nor `tasks.md` names. A test file in `out_of_allowed` for a GREEN dispatch, or any edit of a planning artifact by a worker, is a verification failure and goes to recovery: an amendment never legitimizes what a worker's role forbids.
- **Close.** A `DEVIATION` letter from `close` or `close --dry-run` after a passing verify, whose cross-check lists `Extra` or `Missing` paths. `Missing` qualifies because the Step's tests pass. Each `MISMATCH`, generated-family, staging, or preservation finding follows § Step commit gate point 5.

## Mode

Read `fast_track_active`.

- **Active** (`/sai-build`, `/sai-4-apply --fast-track`): amend on your own and print the notice.
- **Inactive:** show the discrepancy and the exact edit, then ask through the native picker: `Amend the plan as shown?` with `Amend` (`amend-plan`) and `Stop the run` (`stop-run`). On `stop-run`, stop with the current stop report; the working tree stays as it is.

## Amend

1. **Edit.** Make the smallest edit that makes the artifact true to the verified work, and edit only what the evidence shows wrong:
   - an extra or omitted file: add the path to the Step's `**Files Affected**` with its existence-derived token (`A` new, `M` existing, `D` deleted, `R` renamed);
   - a declared file the Step left unchanged: remove its entry;
   - another defect, such as a signature in `interfaces.md`, a decision in `design.md`, or a scope line in `proposal.md`: correct it the same way, under the same mode and trace.
2. **Manifest.** When `tasks.md` changed, resolve `file-manifest.js` per `@sai/policies/tool-resolution.md` and run `node <tool> fold {change-name} --json --cwd <project-root>`; `design.md` joins the amendment.
3. **Notice.** Print one line per amended path, exactly `> PLAN AMENDED: <path> — Step N — <reason>`.
4. **Appendix and receipt.** The Appendix block goes in `implementation.md` § Appendix: Plan vs Final Implementation (runner § Appendices), titled `### Step N — Plan amended: <path>`, with the original content under **Plan:**, the amended content under **Final:**, and the discrepancy under **Reason:**. The receipt is `apply-step.js checkpoint-plan` (coordinator § Step close) with the current `--settled`; require its `registers` to list exactly the artifacts you edited, and pass the returned `--plan-checkpoint` to the repeated call. The order follows the trigger:
   - **Run start:** write the block now, before the baseline capture; no receipt. The baseline declares the amendment instead (§ Commit).
   - **Verify:** take the receipt now for the repeated `verify`; write the block in the Step loop's Record step once that verify passes, then take a second receipt for `close`.
   - **Close:** write the block, then take the receipt.
5. **Repeat.** Run the refused call again: `preflight` at run start, `verify` after a failed verify, `close --dry-run` or `close` at the commit gate.

## Commit

`close` adds the registered artifacts to the Step's commit and keeps them out of the file comparison, so the add-list stays the worker's field 8. Add one body line to the commit message, `Plan amended: <path> — <reason>`, per artifact. A run-start amendment predates the baseline: capture the baseline once, after the amendment, with one `amended: <path>` stdin line per amended artifact beside the other planning input paths. The first Step that closes commits those artifacts, and a later amendment of the same artifact is registered and committed like any mid-run one. An artifact untracked or dirty at the baseline needs nothing else: a receipt or an `amended:` line makes its content the Step's to commit, while an unregistered edit stays an error. A declined commit leaves the amended artifacts in the working tree for the next Step that closes; name them in the declined-commit message.

## Limits

- One amendment per discrepancy. When the repeated call is still refused, stop with the stop report; make no second automatic attempt.
- An amendment affects the Steps that follow. Closed Steps are neither reopened nor re-verified; an inconsistency it introduces surfaces in later Step tests or the terminal suite.
- The baseline and run identity stay as captured. Amend only while `preservation_errors` is empty, because a receipt registers whatever the amendable artifacts hold.
