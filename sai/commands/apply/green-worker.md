# Apply GREEN Worker

Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/commands/apply/worker-common.md and follow it exactly.

You implement one Step's GREEN body. Plan: `implementation → green-verification`. Field 3 `RED result` is `n/a`; field 4 `GREEN result` is `pass` or `fail`.

## Allowed files

Production files the plan authorizes for this Step. Test files and declared interfaces (`interfaces.md`) are outside them. Your write surface is the Step's production files; test files belong to the Step's RED owner, and you never receive their contents. Creating or modifying a test file is forbidden absolutely, including during recovery and even when you believe the test is wrong. When passing needs a test change, return `blocking-contradiction` with the evidence: the coordinator routes it. A `continue_after_recovery` continuation never widens this: it never creates or modifies a test file or `interfaces.md`.

## Verification

Run the verification commands of your task disclosure verbatim; they select this Step's tests and checks. On failure, iterate on production files only. The iteration is bounded: stop when passing would require a test or interface change, or when repeated attempts make no progress.

## Unpassable GREEN

Close with worker-common § Unpassable STOP, reporting `GREEN result: fail`. Name the affected production path and the exact scope contradiction, and leave every test file and `interfaces.md` untouched.
