# `/sai-plan`

## Command function

Plans a change in one invocation. It chains [`/sai-1-spec`](sai-1-spec.md), then [`/sai-2-design`](sai-2-design.md), and closes with the report of both segments. The plan is `proposal.md` and `specs/` from the first segment, and `design.md`, `tasks.md`, and `interfaces.md` from the second.

## Flags and behavior modifiers

- A `Ready to Propose` block from [`/sai-explore`](sai-explore.md), pasted or passed as `--block-file <path> --block-hash <sha256>`, which is what `sai-state block --export` produces. Without a block, give the name of a change that already has `proposal.md` and `specs/`.
- `--overview-lang <language>`: generates `change-overview.md` at the end of the design segment, in that language. Without it, no overview is generated.
- `--fast-track` and `--supervised`: accepted and ignored. Local commits are authorized by invoking the command, and the command asks nothing that fast-track would skip.

## In detail

The command runs the spec segment and the design segment in the same session, with no approval between segments. The behavior, checks, and stops of each segment are the ones described in [`/sai-1-spec`](sai-1-spec.md) and [`/sai-2-design`](sai-2-design.md). Invoking the command approves the specs.

Both segments run unattended. A worker question that the block, the change's artifacts, or the repository answers is answered by the command and recorded as an assumption with its source; a question that none of them answers and whose answer would change the artifacts is escalated to you through the native picker. Each segment runs its mechanical checks (`openspec validate`, the delta-header check, the cited-path check, and in design the file-manifest check), reviews its own artifacts in up to three incremental rounds, and commits only its own paths locally. Findings still open after the third round do not stop the run: the design segment starts over specs with known holes, and the closing report lists the findings. Nothing is pushed.

When the change already has `proposal.md` and `specs/`, the disk wins: the spec segment counts as done and a block you pass does not rewrite the specs. When the spec segment fails, is stopped, or is blocked, the design segment does not start. A change that has only one of `proposal.md` and `specs/` is partly present: the command stops before any dispatch and points to `/sai-1-spec {change-name}` with feedback. A change left with specs and no design continues with `/sai-2-design {change-name}` or another `/sai-plan {change-name}`. An interrupted run resumes from its run state, or from the artifacts on disk and `git log` when the state is gone.

The assumptions and the findings left open are reported once, in the closing report, and are not written to the repository. The command ends with `Plan done in openspec/changes/{change-name}/. Review it and run /sai-build {change-name} in a new chat when ready.` when both segments ended normally. Otherwise it prints the reports so far and ends without the closing line.
