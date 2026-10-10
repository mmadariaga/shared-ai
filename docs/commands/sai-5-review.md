# `/sai-5-review`

## Command function

Reviews the completed changes and produces a report with problems, risks, omissions, and recommendations. It also determines whether a specialized security, performance, or accessibility review would be useful.

## Flags and behavior modifiers

- `--parent-branch <branch>`: the branch the change is compared against. It is the only way to name it; a bare second word is rejected.

It receives the change name and reviews the diff only, so it has no `--full` or `--path`. It asks nothing between choosing the change and the Direct Build close.

## In detail

The command examines the change from several perspectives: correctness, alignment with the goal, test quality, compatibility with the rest of the project, and possible regressions. It looks for concrete evidence and identifies where each problem is located so it can be verified and corrected.

In addition to the usual checks, it can perform a deterministic check of changes that alter behavior. The report distinguishes important problems from minor observations and explains why each finding deserves attention.

At the end, it identifies the type of surface affected. For example, it may recommend a security review if permissions or sensitive data were changed, a performance review if expensive operations were modified, or an accessibility review if an interface was changed. The recommended reviews can be run afterward.

Once the review is written, the command offers the Direct Build close: fix the open findings and make one local commit. It reads the on-disk security, performance, and accessibility reports as they are, and says in chat that they may be stale, so their findings can be selected in the same round. The close is one round with one question per report that has an open fixable finding or an open Question, in the order review, security, performance, accessibility; when no report qualifies, the command ends with no round. A fixable finding is any finding that is not a Question. Each Question is shown in full before the round, and the user answers it in the free text of its report's question; it is fixed when answered and stays open otherwise. Each question offers three answers: fix every fixable finding, fix nothing, or free text with the identifiers to exclude and the answers to the Questions. If every answer is "fix nothing", or the picker is dismissed, nothing is dispatched and nothing is committed. Choosing to fix anything authorizes the writes and one local commit. An unknown identifier repeats only that report's question, once; a second invalid answer ends the command with no commit. On Claude Code the round is one question call; on opencode it is the same questions, in one call when its picker allows it and one after another otherwise. If the fix does not converge within three fix rounds, nothing is committed.
