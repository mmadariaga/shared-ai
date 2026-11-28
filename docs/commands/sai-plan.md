# `/sai-plan`

## Command function

Plans a change in one invocation. It chains [`/sai-1-spec`](sai-1-spec.md), then [`/sai-2-design`](sai-2-design.md), and closes with the report of both segments. The plan is `proposal.md` and `specs/` from the first segment, and `design.md`, `tasks.md`, and the interface stubs and failing tests of the whole change (the plan tests, written by the plan RED) from the second. The plan tests fail by design, so the continuous integration of the draft request stays red until the build runs.

## Flags and behavior modifiers

- A change document from [`/sai-explore`](sai-explore.md), pasted or passed as `--document-file <path> --document-hash <sha256>`, which is what `sai-state block --export` produces. Without a document, give the name of a change that already has `proposal.md` and either a spec file or `.openspec.yaml` with `skip_specs: true`.
- `--overview-lang` no longer exists: passing it ends the run with an unknown-option error before anything is written.
- `--publish [yes|no|draft]`: answers the publication question below in advance. A bare `--publish` is `yes`, and `draft` does the same as `yes` because the plan's request is always a draft; `no` publishes nothing. Any other value, or a second `--publish`, ends the run before anything is written.
- `--build-publish <yes|no|draft>`: sets the publication flag carried by the closing build hint. It is accepted on any invocation, wins over `pr.publishAfterRun`, and does not change the plan's own publication. A bare `--build-publish`, any other value, or a second `--build-publish` ends the run before anything is written with `Cannot start /sai-plan: --build-publish takes yes, no or draft.` The `/sai-explore` Plan route passes it from the set's publication answer and slice position.
- `--expert-review [no|auto|ask]`: answers the adversarial expert review question below in advance. A bare `--expert-review` is `auto`; any other value, or a second `--expert-review`, ends the run before anything is written with `Cannot start /sai-plan: --expert-review takes no, auto or ask.` The `expertReview.plan` project setting answers it next, and the `/sai-explore` Plan route always passes `no` unless that setting is `auto`, because explore ran its own checkpoint on the documents.

## In detail

The command asks one question at its start: whether to publish a **draft PR/MR** of the plan
on GitHub, GitLab or Azure DevOps when the run ends, through [`/to-pr`](to-pr.md). It asks
after its input checks pass (the document and its hash, the change name) and before the first
worker starts, and it names the current branch, its remote, and the request state: a new
request is created as a draft, and an open request of the branch is updated and keeps its
draft or ready state. The answer comes from, in this order, the `--publish [yes|no|draft]` argument
(a bare `--publish` is `yes`, and `draft` is normalized to `yes`),
the answer a resumed run already recorded, the [`pr.publishAfterRun`](../project-settings.md#plan-publication-answer)
setting when it reads `yes` or `no`, and then the question; the first value found wins and
nothing later is asked. The same start question applies when Explore runs Plan; standalone
spec and design ask nothing.

With `no`, nothing is published and nothing is asked again. With `yes`, the answer is the
authorization for exactly three operations on the current branch, and nothing asks you again:
one local commit of the plan documents (the exact files `plan-query` lists, including ignored
files, `proposal.md`, `design.md`, `tasks.md`, `.openspec.yaml`, and the specifications; the design segment's stub and test commits are ordinary commits of the branch, carried by the push; unrelated staging and work stay
untouched, and ordinary planning still never force-adds ignored files), a push without force,
and the creation or update of the request. The run publishes after its last local commit, the
telemetry commit included, and prints the verified request URL or the reason nothing was
published. A run that fails, stops, or ends on an unanswered escalation publishes nothing,
whatever the answer. On the default branch or a detached HEAD, with no provider or remote, a
failed authentication, a rejected push (never retried with force), or a branch whose request
was merged or closed (never reopened), publication is skipped with its reason and the run still
counts as completed. All committed branch changes enter the request: it need not be
documents-only. Implementation uses this same branch and request later; the plan never marks the
request ready, and [`/sai-build`](sai-build.md) marks an open draft request ready only when it holds its own `yes` answer, while a `draft` answer creates or keeps a draft. An unattended run publishes without a final look at the request text; you
accept that when you answer `yes` or `draft`.

The command runs the spec segment and the design segment in the same session, with no approval between segments. The behavior, checks, and stops of each segment are the ones described in [`/sai-1-spec`](sai-1-spec.md) and [`/sai-2-design`](sai-2-design.md). Invoking the command approves the specs.

The command also asks, at the same moment and only when no earlier source answered it, whether an independent expert review should check the finished plan. The answer comes from `--expert-review [no|auto|ask]` (a bare flag is `auto`), the answer a resumed run recorded, the `expertReview.plan` project setting, and then one question with `No`, `Yes, decide the corrections`, and `Yes, ask me before keeping them`. A `no` answer creates no worker and changes nothing. With `auto` or `ask`, one `sai-adversarial-expert-review-worker` reads the design segment's plan documents, plan tests, and stubs against the approved specs after the segment's review rounds and before its commits, and proposes corrections; the plan coordinator keeps or reverts each one (`auto`), or asks you once first (`ask`). Kept corrections are re-checked (every mechanical check, and every plan test still red by assertion), then travel in the design segment's own commits; a kept correction that fails a check reverts every worker change, so the plan equals its state before the checkpoint. The closing report lists the kept and discarded findings with one reason each, and the findings that carried no correction. A missing or failed worker report costs one line and the run continues as after `no`. The model of the reviewer is a `setup` choice, not a card detail.

Both segments run unattended. A worker question that the document, the change's artifacts, or the repository answers is answered by the command and recorded as an assumption with its source; a question that none of them answers and whose answer would change the artifacts is escalated to you through the native picker. Each segment runs its mechanical checks (`openspec validate`, the delta-header check, the cited-path check, and in design the file-manifest check), reviews its own artifacts in up to three incremental rounds, and commits only its own paths locally. Findings still open after the third round do not stop the run: the design segment starts over specs with known holes, and the closing report lists the findings. Nothing is pushed.

When the change already has `proposal.md` and a spec file, or `proposal.md` and `.openspec.yaml` with `skip_specs: true`, the disk wins: the spec segment counts as done and a block you pass does not rewrite it. When the spec segment fails, is stopped, or is blocked, the design segment does not start. An incomplete set without that no-specs declaration stops before dispatch and points to `/sai-1-spec {change-name}` with feedback. A change ready for design continues with `/sai-2-design {change-name}` or another `/sai-plan {change-name}`. An interrupted run resumes from its run state, or from the artifacts on disk and `git log` when the state is gone.

With `experimental.changeTelemetry` on, the command records the run's cost in `telemetry.md` in the change folder at its close, and invoking it pre-authorizes one more local commit for that file; see [change telemetry](../project-settings.md#change-telemetry).

When the spec segment runs, the design segment reuses the research it did: the spec worker's explorers save their reports in a run-scoped research directory, the spec worker records only its exceptions in an annotations file, and design reads those annotations first and researches only its own gaps. A saved file that is no longer usable costs one line in the closing report and never stops the run. Running `/sai-2-design` alone reuses nothing.

The assumptions and the findings left open are reported once, in the closing report, and are not written to the repository. When both segments ended normally, the planning report closes with `Plan done in openspec/changes/{change-name}/. Review it and run /sai-build {change-name} <build-publish> in a new chat when ready.`, where `<build-publish>` is `--publish` for a `yes` recommendation, `--publish draft` for `draft`, or `--publish no` for `no`. The value is the `--build-publish` argument when given; otherwise `pr.publishAfterRun` decides: `no` gives `--publish no`, and `yes`, `ask`, or an absent value gives the bare `--publish` as a recommendation. In the `/sai-explore` Plan route, the value comes from the set's publication answer, branch strategy, and pending slices, and the plan coordinator prints the only hint. A publication that was answered `yes` runs before this line and prints its outcome with the reports. Otherwise the command prints the reports so far and ends without the closing line, and publishes nothing.
