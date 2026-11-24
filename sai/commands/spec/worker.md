# Spec worker (`/sai-1-spec`)

Fetch `@sai/commands/plan/worker-common.md` and follow it exactly.
Fetch `@sai/policies/bounded-dispatch-retry.md` and follow it for every delegated subagent dispatch.
Fetch `@sai/commands/spec/steps/common.md` and keep it in force for the entire segment.

You write the normative translation of a request: `proposal.md` and the capability delta specs of one change. Design, tasks, code, tests, and configuration belong to later phases.

## Write surface

You write only:

- `openspec/changes/{change-name}/proposal.md`;
- `openspec/changes/{change-name}/specs/**`;
- `openspec/changes/{change-name}/.openspec.yaml`, which `openspec new change` creates on a creation run and which you touch afterwards only to preserve the block's `backlog_origin` and `explore_origin` and to set `skip_specs: true` when the block declares no specs (see Intake), leaving every other key as it is;
- the repository-root `GLOSSARY.md`, only for terms this segment resolved.

Anything else is outside your surface, including pre-existing later-phase artifacts such as `design.md` or `tasks.md`, which stay untouched.

## Intake (`spec-intake`)

Run this step inline before any pointer. The message names the mode:

- **Creation.** The brief names `block_file`, a verified file that holds one `Ready to Propose` block. Read it as the request, whole and verbatim; it is your only substantive input and no conversation context stands behind it. The change name is the block's `Change name`. Only the items under `Implementation Details` count: the items under `Out of scope Implementation Details` are non-normative context and never become requirements or scenarios of this change. When `Implementation Details` is `- None`, derive the proposal and specs from `Capabilities in scope`, the request, and `Edge Cases` only.

  **No-specs declaration.** When the block carries `**Specs**: none — <reason>`, the change has no spec-level behavior. Write `proposal.md` only, list no capability in it, write no file under `specs/`, and set `skip_specs: true` in `.openspec.yaml`. When files already exist under `specs/`, leave them and do not set the marker: the files on disk win. A block without that line never leads to `skip_specs`: no judgment of yours replaces the block's declaration, so such a change always gets at least one spec file.
- **Refinement.** The change already holds `proposal.md` or `specs/**`, and the brief names a feedback file. Work from the existing artifacts and the feedback; no block stands behind it. Apply exactly the feedback, keep every statement it does not touch, and leave a requirement or scenario alone unless the feedback or Rule #1 of `common.md` reaches it. When a piece of feedback does not hold against the artifacts or the code, leave the artifacts unchanged for it and name it, with the reason, in `notes`.

Fetch `@sai/policies/issue-origin-preservation.md` and apply its planning-output handoff check, including retaining a valid existing origin during refinement. When the validated block contains `**Backlog origin**`, preserve the validator's returned `backlog_origin` (that exact selected issue URL) as the change's `.openspec.yaml` `backlog_origin`, and list that metadata path in `changed_files`. This is issue provenance only: you perform no assignment or other remote mutation, and a parent context URL never replaces the selected child origin.

When the validated block contains `**Explore origin**`, write the validator's returned `explore_origin` list as the flat flow list `explore_origin: [<sessionID>, <sessionID>]` in the change's `.openspec.yaml`, in the block's order, and list that metadata path in `changed_files`. A refinement run with no block leaves an existing `explore_origin` as it is. This is telemetry provenance only: the key adds no requirement and no scope.

Report `spec-intake` together with `research` in the first report, after the research step the first pointer names.

## Research hand-over

Inside `/sai-plan` your brief may name `research_dir`: the directory where your explorers save their reports for the design segment. Without it, none of this applies and `research_files` is an empty list in every `completed` report.

- **Explorers.** Open the task of every `budget-explorer` you dispatch with the line `--report-dir <research_dir>` (`steps/common.md` § Cost discipline). Each explorer answers with the `{path, sha256}` reference of its saved, verbatim report. Keep every reference and never rewrite, summarize, or re-save a report. A report of an explorer that replied in text is not a research file.
- **Annotations.** Annotations hold your exceptions only: one entry for each point where your own reading departs from, or leaves a gap in, an explorer's report. Write them to a unique draft file in your run directory and save it with `transfer.js put --dir <research_dir> --path spec-annotations.md --exclusive --input-file <draft>`, once, when the `research` step ends (your first report) and only when there is at least one entry; with none, no file exists. Each entry is one line, `<kind> <path>:<line> - <reason in one sentence>`, with `kind` one of `corrected` (a report claim you proved wrong), `rejected` (a premise or claim you refuse), `own-read` (a fact you read yourself that the reports do not carry), or `gap` (a question left open that design should settle). A citation without an entry means that you did not contradict it, not that you confirmed it, because research stops at about 80% confidence.
- **Report field.** Every `completed` report carries `research_files`, a list of `{path, sha256}` strings: the reference of each saved explorer report and of the annotations file, exactly as `put` and the explorers printed them. The list is empty when you saved nothing. Every later `completed` report, a fix round included, repeats the whole list unchanged.

## Done

The segment's work is done when:

- `proposal.md` and every capability delta spec exist and satisfy the verification of `common.md`;
- every term you resolved is in `GLOSSARY.md`;
- your last report carries the decision summary as `summary` and the consistency warnings as `warnings`, as the validation step says.

Report `failed` when the request cannot be translated as written, naming the obstacle.
