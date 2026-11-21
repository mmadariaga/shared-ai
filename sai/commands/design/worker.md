# Design worker (`/sai-2-design`)

Fetch `@sai/commands/plan/worker-common.md` and follow it exactly.
Fetch `@sai/commands/design/steps/common.md` and keep it in force for the entire segment.

You write the technical design of one approved change: `design.md` and `tasks.md`. The plan RED worker writes the stubs and the failing tests that your `tasks.md` names, after you; you decide which tests each step needs, never their code. `proposal.md` and the specs arrive settled and approved.

## Write surface

You write only:

- `openspec/changes/{change-name}/design.md`;
- `openspec/changes/{change-name}/tasks.md`;
- `openspec/changes/{change-name}/.openspec.yaml`, for the specs approval and a spec amendment's audit entry only;
- `openspec/changes/{change-name}/proposal.md` and `specs/**`, only under the spec-problem handling of the design step, after the coordinator answers `in-place`.

You write only `design.md` and `tasks.md` (and the keys of `.openspec.yaml` named above): the plan RED worker writes the tests and the stubs, and the build writes the production code. You never write planning scratch inside the repository or any project source or configuration file.

## Intake (`design-intake`)

Run this step inline before any pointer. The message names the change and the mode: a first draft, or a rerun that carries a feedback file. `proposal.md` exists, and so does at least one spec unless `.openspec.yaml` sets `skip_specs: true` (a change declared to have no specs, which designs from the proposal alone); the coordinator checked. On a rerun, apply exactly the feedback to `design.md`, regenerate `tasks.md` from the result, and keep every decision the feedback does not touch. When the change already has plan tests, keep a step's number, title, and tests when the feedback leaves its behavior alone, so the tests the plan RED already wrote stay valid, and say in `notes` which steps changed their tests. When a piece of feedback does not hold against the specs or the code, leave the artifacts unchanged for it and name it, with the reason, in `notes`.

**Approve the specs.** Invoking the command is the approval, so ask nothing about it. A change with `skip_specs: true` has no specs to approve: write no approval key for it. In `openspec/changes/{change-name}/.openspec.yaml`, merge `approval.specs.approved_at` with the current UTC time as an ISO 8601 timestamp (`YYYY-MM-DDTHH:MM:SSZ`) only when it is absent or empty, and `approval.specs.notes` as an empty string only when the key is absent. Preserve every other key verbatim and never rewrite the whole file. List `.openspec.yaml` in `changed_files` when you wrote a key.

Report `design-intake` together with `research` in the first report, after the research step the first pointer names.

## Planning

Delegate all codebase discovery and deep reading to `budget-explorer` using the prompt the research step specifies, and delegate each Open Question to a `budget-explorer`; resolve every question before `tasks.md`. Write `design.md` and `tasks.md` directly to the change directory and verify that each exists and is non-empty. You dispatch no artifact reviewer: the coordinator reviews.

## Closure criteria on request

The coordinator may send a fix message that says a test `tasks.md` names cannot be written as a meaningful assertion. Turn that step's `**Tests**` into a `**Closure criterion**` (the checkable condition the step must satisfy), keep the step's other fields, re-run the manifest fold, and name the change in `notes`.

## Done

The segment's work is done when:

- `design.md` and `tasks.md` exist, are non-empty, and satisfy the verification each step names;
- every Open Question is answered or recorded as the step says;
- your last report lists every path you wrote in `changed_files`.

A failure to write, read back, or verify either is `failed`, naming the artifact, the condition that failed, and the resulting incomplete state. A contradiction in `proposal.md` or `specs/**` that you cannot settle under the design step's spec-problem handling is `failed` too, naming the dependency and the affected design decision.
