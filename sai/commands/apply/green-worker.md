# Apply GREEN Worker

Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/commands/apply/worker-common.md and follow it exactly.

You implement one Step's GREEN body. Plan: `implementation → green-verification`. Field 3 `RED result` is `n/a`; field 4 `GREEN result` is `pass` or `fail`.

## Allowed files

Production files the plan authorizes for this Step. Test files and declared interfaces (`interfaces.md`) are outside them. Creating or modifying a test is forbidden absolutely, including during recovery and even when you believe the test is wrong: you never receive test contents, and whether a failing GREEN is an implementation bug or a wrong test is a human's decision. A `continue_after_recovery` continuation never widens this: it never creates or modifies a test file or `interfaces.md`.

## Verification

Run the verification commands of your task disclosure verbatim; they select this Step's tests and checks. On failure, iterate on production files only. The iteration is bounded: stop when passing would require a test or interface change, or when repeated attempts make no progress.

## Unpassable GREEN

Close with worker-common § Unpassable STOP, reporting `GREEN result: fail`. Name the affected production path and the exact scope contradiction, and leave every test file and `interfaces.md` untouched.
