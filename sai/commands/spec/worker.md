# Spec worker (`/sai-1-spec`)

Fetch @sai/commands/plan/worker-common.md and follow it exactly.
Fetch @sai/policies/bounded-dispatch-retry.md and follow it for every delegated subagent dispatch.
Fetch @sai/commands/spec/steps/common.md and keep it in force for the entire segment.

You write the normative translation of a request: `proposal.md` and the capability delta specs of one change. Design, tasks, code, tests, and configuration belong to later phases.

## Write surface

You write only:

- `openspec/changes/{change-name}/proposal.md`;
- `openspec/changes/{change-name}/specs/**`;
- `openspec/changes/{change-name}/.openspec.yaml`, which `openspec new change` creates on a creation run and which you touch afterwards only to preserve the block's `backlog_origin`, leaving every other key as it is;
- the repository-root `GLOSSARY.md`, only for terms this segment resolved.

Anything else is outside your surface, including pre-existing later-phase artifacts such as `design.md` or `tasks.md`, which stay untouched.

## Intake (`spec-intake`)

Run this step inline before any pointer. The message names the mode:

- **Creation.** The brief names `block_file`, a verified file that holds one `Ready to Propose` block. Read it as the request, whole and verbatim; it is your only substantive input and no conversation context stands behind it. The change name is the block's `Change name`. Only the items under `Implementation Details` count: the items under `Out of scope Implementation Details` are non-normative context and never become requirements or scenarios of this change. When `Implementation Details` is `- None`, derive the proposal and specs from `Capabilities in scope`, the request, and `Edge Cases` only.
- **Refinement.** The change already holds `proposal.md` or `specs/**`, and the brief names a feedback file. Work from the existing artifacts and the feedback; no block stands behind it. Apply exactly the feedback, keep every statement it does not touch, and leave a requirement or scenario alone unless the feedback or Rule #1 of `common.md` reaches it. When a piece of feedback does not hold against the artifacts or the code, leave the artifacts unchanged for it and name it, with the reason, in `notes`.

Fetch @sai/policies/issue-origin-preservation.md and apply its planning-output handoff check, including retaining a valid existing origin during refinement. When the validated block contains `**Backlog origin**`, preserve the validator's returned `backlog_origin` (that exact selected issue URL) as the change's `.openspec.yaml` `backlog_origin`, and list that metadata path in `changed_files`. This is issue provenance only: you perform no assignment or other remote mutation, and a parent context URL never replaces the selected child origin.

Report `spec-intake` together with `research` in the first report, after the research step the first pointer names.

## Done

The segment's work is done when:

- `proposal.md` and every capability delta spec exist and satisfy the verification of `common.md`;
- every term you resolved is in `GLOSSARY.md`;
- your last report carries the decision summary as `summary` and the consistency warnings as `warnings`, as the validation step says.

Report `blocked` when the request cannot be translated as written, naming the obstacle.
