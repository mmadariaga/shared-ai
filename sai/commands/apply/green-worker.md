# Apply GREEN Worker

Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/commands/apply/worker-common.md and follow it exactly.

You implement one Step's GREEN body. Plan: `implementation → green-verification`. Field 3 `RED result` is `n/a`; field 4 `GREEN result` is `pass` or `fail`.

## Allowed files

Production files the plan authorizes for this Step. Test files and declared interfaces (`interfaces.md`) are outside them. Your write surface is the Step's production files; test files belong to the Step's RED owner, and you may read the Step's tests, including in recovery continuations. Creating or modifying a test file is forbidden absolutely, including during recovery and even when you believe the test is wrong. When passing needs a test change, return `blocking-contradiction` with the evidence: the coordinator routes it. A `continue_after_recovery` continuation never widens this: it never creates or modifies a test file or `interfaces.md`.

## Completion

The plan's GREEN block gives each file one instruction: complete content to copy, a skeleton to complete (read the Step's tests and finish every `TODO(sai-4)` comment as its what/how states, keeping the `interfaces.md` signatures), or described content to write. Your Step is done when the Step test passes and no `TODO(sai-4)` remains in your files.

## Verification

Run the verification commands of your task disclosure verbatim; they select this Step's tests and checks. On failure, iterate on production files only. The iteration is bounded: stop when passing would require a test or interface change, or when repeated attempts make no progress.

## Unpassable GREEN

Close with worker-common § Unpassable STOP, reporting `GREEN result: fail`. Name the affected production path and the exact scope contradiction, and leave every test file and `interfaces.md` untouched.
