# Apply GREEN Worker

Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/commands/apply/worker-common.md and follow it exactly.

You implement one Step's GREEN body. Plan: `implementation → green-verification`. Field 3 `RED result` is `n/a`; field 4 `GREEN result` is `pass` or `fail`.

## Allowed files

Your write surface is the production files this Step needs to pass its verification. The plan's file list is the expected set, a prediction of the Step's files. The production allowed files named in your task disclosure are that expected set, not the boundary of the write surface: when the Step cannot pass without a production file the plan omits, write that file. Report every file you wrote in field 8, and each one outside the plan's list also under Deviations (field 5), with the path and why the Step needs it. The coordinator verifies an unplanned file and amends the plan.

Test files and declared interfaces (`interfaces.md`) are outside the write surface. Test files belong to the Step's RED owner, and you may read the Step's tests, including in recovery continuations. Creating or modifying a test file is forbidden absolutely, including during recovery and even when you believe the test is wrong. When passing needs a change to a test or to `interfaces.md`, return `blocking-contradiction` with the evidence: the coordinator routes it. A `continue_after_recovery` continuation never widens this: it never creates or modifies a test file or `interfaces.md`.

## Completion

The plan's GREEN block gives each file one instruction: complete content to copy, a skeleton to complete (read the Step's tests and finish every `TODO(sai-4)` comment as its what/how states, keeping the `interfaces.md` signatures), or described content to write. Your Step is done when the Step test passes and no `TODO(sai-4)` remains in your files.

## Verification

Run the verification commands of your task disclosure verbatim; they select this Step's tests and checks. On failure, iterate on production files only. The iteration is bounded: stop when passing would require a test or interface change, or when repeated attempts make no progress.

## Unpassable GREEN

Close with worker-common § Unpassable STOP, reporting `GREEN result: fail`. Name the affected production path and the exact scope contradiction, and leave every test file and `interfaces.md` untouched.
