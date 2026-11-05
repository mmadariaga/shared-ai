# `/sai-plan`

## Command function

Plans a change in one invocation. It chains [`/sai-1-spec`](sai-1-spec.md), then [`/sai-2-design`](sai-2-design.md), and closes with the report of both segments. The plan is `proposal.md` and `specs/` from the first segment, and `design.md`, `tasks.md`, and `interfaces.md` from the second.

## Flags and behavior modifiers

- A `Ready to Propose` block from [`/sai-explore`](sai-explore.md), pasted or passed as `--block-file <path> --block-hash <sha256>`, which is what `sai-state block --export` produces. Without a block, give the name of a change that already has `proposal.md` and either a spec file or `.openspec.yaml` with `skip_specs: true`.
- `--overview-lang <language>`: generates `change-overview.md` at the end of the design segment, in that language. Without it, no overview is generated.

## In detail

After successful planning, one optional offer creates or updates a **draft PR/MR**
on GitHub, GitLab or Azure DevOps through [`/to-pr`](to-pr.md). This also applies
when Explore runs Plan; standalone spec and design do not offer it. Declining or
cancelling keeps the completed plan and makes no publication changes.

Accepting only starts preparation. You review the exact current-change documents
(including ignored files, `.openspec.yaml`, specifications and an optional overview)
before authorizing their local inclusion commit. Unrelated staging and work stay
untouched, and ordinary planning still never force-adds ignored files. You then
approve the exact non-force push and draft publication separately from local inclusion.
All committed branch changes are disclosed: this need not be a documents-only PR/MR.
An existing matching request is reused; converting a ready request to draft needs
explicit approval. A later cancellation or failure keeps any confirmed commit or push.
Publication problems do not undo planning. Implementation uses this same branch
and request later, without automatically marking it ready.

The command runs the spec segment and the design segment in the same session, with no approval between segments. The behavior, checks, and stops of each segment are the ones described in [`/sai-1-spec`](sai-1-spec.md) and [`/sai-2-design`](sai-2-design.md). Invoking the command approves the specs.

Both segments run unattended. A worker question that the block, the change's artifacts, or the repository answers is answered by the command and recorded as an assumption with its source; a question that none of them answers and whose answer would change the artifacts is escalated to you through the native picker. Each segment runs its mechanical checks (`openspec validate`, the delta-header check, the cited-path check, and in design the file-manifest check), reviews its own artifacts in up to three incremental rounds, and commits only its own paths locally. Findings still open after the third round do not stop the run: the design segment starts over specs with known holes, and the closing report lists the findings. Nothing is pushed.

When the change already has `proposal.md` and a spec file, or `proposal.md` and `.openspec.yaml` with `skip_specs: true`, the disk wins: the spec segment counts as done and a block you pass does not rewrite it. When the spec segment fails, is stopped, or is blocked, the design segment does not start. An incomplete set without that no-specs declaration stops before dispatch and points to `/sai-1-spec {change-name}` with feedback. A change ready for design continues with `/sai-2-design {change-name}` or another `/sai-plan {change-name}`. An interrupted run resumes from its run state, or from the artifacts on disk and `git log` when the state is gone.

The assumptions and the findings left open are reported once, in the closing report, and are not written to the repository. When both segments ended normally, the planning report closes with `Plan done in openspec/changes/{change-name}/. Review it and run /sai-build {change-name} in a new chat when ready.` This closes the report, not the command interaction: planning completes and its run closes first, then the sole optional publication offer and any accepted continuation run. Otherwise the command prints the reports so far and ends without the closing line or publication offer.
