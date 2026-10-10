# `/sai-5-review`

## Command function

Reviews the completed changes and produces a report with problems, risks, omissions, and recommendations in Claude Code and opencode. It also determines whether a specialized security, performance, or accessibility review would be useful.

## Flags and behavior modifiers

- `--parent-branch <branch>`: the branch the change is compared against. It is the only way to name it; a bare second word is rejected.

It receives the change name and reviews the diff only, so it has no `--full` or `--path`. It asks nothing between choosing the change and the Direct Build close.

## In detail

The command examines the change from several perspectives: correctness, alignment with the goal, test quality, compatibility with the rest of the project, and possible regressions. It looks for concrete evidence and identifies where each problem is located so it can be verified and corrected.

In addition to the usual checks, it can perform a deterministic check of changes that alter behavior. The report distinguishes important problems from minor observations and explains why each finding deserves attention.

`review.md` records provenance, the three audit recommendations, findings with
location/problem/suggested fix, Questions, and the original severity tally.
Uncovered acceptance criteria become findings; scope creep and disagreements
with recorded decisions become Questions for you to answer. Maintainability
review resolves competing practices using SAI's code-quality priority stack,
with established project patterns taking precedence over its lower-priority rules.

At the end, it identifies the type of surface affected. For example, it may recommend a security review if permissions or sensitive data were changed, a performance review if expensive operations were modified, or an accessibility review if an interface was changed. The recommended reviews can be run afterward.

After writing review, the command offers the same [final fix selection](../review-triage.md#select-fixes-at-the-final-close) as `/sai-review`. It also reads existing security/performance/accessibility reports and warns that they may be stale; it does not rerun those audits. Selecting fixes authorizes writes and one local commit with ` (FIXED)` marks. Excluded findings and unanswered Questions stay open. Non-convergence commits nothing. The close runs no tests before committing, so run project checks afterward. Use `/sai-review` when you want the relevant audits regenerated in the same run.
