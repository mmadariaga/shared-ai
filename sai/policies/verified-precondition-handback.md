# Verified Precondition Hand-back

An improvised hand-back is an off-contract direction that sends the user to another command because a precondition looks unmet, for example "run `/sai-2-design` first: `approval.specs.approved_at` is missing". Verify it before you say it.

## Evidence required before a hand-back

Complete every check in the current invocation:

1. Name the concrete project-relative file and the concrete key whose state is at issue.
2. Read that file and inspect that exact key path. An absent key counts as established when you inspected its exact path in an existing current file. A missing cited file makes this current-read check unsatisfiable.
3. Read the destination command's current command card, instruction, or worker contract and confirm an explicit write responsibility for that key. A command that only reads, checks, gates on, or forwards the key does not qualify as its writer.
4. When relaying someone else's hand-back, repeat checks 1–3 independently: an upstream assertion or conversation text is not evidence.

When every check succeeds, issue the hand-back naming the file, the key, and the destination command whose verified contract writes it.

## Incomplete-evidence fallback

When any check fails (a missing cited file, an unread key, or an unconfirmed destination writer), ask the user what to do under `@sai/policies/question-context.md` instead. Name the current state and the verification gap, and state that the verification evidence is incomplete.

## Exclusions

This policy covers improvised hand-backs only. Fixed STOP literals, contract-authored hand-backs, approval gates, file-existence checks, and lifecycle statuses and payloads stay exactly as their contracts write them, and a command's successful path gains no approval, precondition, or other gate from this policy.
