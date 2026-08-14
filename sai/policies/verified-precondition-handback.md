# Verified Precondition Hand-back

This policy governs only an improvised, off-contract direction that sends a user to another command because a precondition is claimed to be unmet.

## Evidence required before a hand-back

Before issuing the hand-back, the authoring surface SHALL complete all of these checks in the current invocation:

1. Name the concrete project-relative file and the concrete key whose state is at issue.
2. Read that file and inspect that exact key path. An absent key may be established by inspecting its exact path in an existing current file. A missing cited file makes the current-read check unsatisfiable, so the fallback below applies.
3. Read the destination command's current command card, instruction, or worker contract and confirm an explicit command-owned write responsibility for the cited key. A command that only reads, checks, gates on, or forwards the key does not establish writer ownership or qualify as the destination writer.
4. When relaying a proposed hand-back, repeat the file, key, and destination-writer checks independently. An upstream assertion or conversation text is not transferred evidence.

Only after every check succeeds may the surface issue the improvised hand-back. The hand-back SHALL name the concrete file and key and the destination command whose verified contract writes that key.

## Incomplete-evidence fallback

If the evidence includes a missing cited file, an unread key, or an unconfirmed destination writer, do not issue the hand-back. Ask the user what to do under `@sai/policies/question-context.md` instead. The question SHALL identify the current state and verification gap, carry the essential context and plain-language options needed for the decision, and state that the verification evidence is incomplete.

This fallback adds no approval, precondition, or other gate to a command's successful path.

## Exclusions

This policy does not rewrite or reinterpret an existing fixed STOP literal, contract-authored hand-back, approval gate, file-existence check, lifecycle status, or lifecycle payload. Those written contracts remain authoritative and byte-identical. No durable verification record is created.
