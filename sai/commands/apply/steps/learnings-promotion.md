# Learnings Promotion

The apply coordinator promotes learnings to the root `SAI_LEARNINGS.md` once at each closing report of `@sai/policies/implementation-closing-report.md`, stopped or completed, before that report prints. The coordinator alone promotes: no worker does, and under `/sai-build` the supervisor does not.

A run that continues after a stop (an authorized Step retry) promotes again at its next closing report. A stop that prints fixed text instead of the closing report (a missing `implementation.md`) promotes nothing, and so does an interruption: a chat that dies without reaching a stop.

## Candidates

- every entry written so far in `## Appendix: Plan vs Final Implementation`;
- the workers' field-6 learnings, as a supplementary source; on a stop these include the stopped Step's.

## Qualification and write

A candidate qualifies only when it names a repository-level artifact, not a symbol or file this change introduced or renamed. Use that artifact as the section key, supersede key, and reader anchor, and the candidate's `**Final:**` value as what works instead. Write only the root `SAI_LEARNINGS.md`, in its four-section format per `@sai/policies/sai-learnings-format.md`; create no empty file when nothing qualifies. An entry an earlier promotion already wrote is superseded by its key.

## Disclosure

When you write the file, disclose in the closing report the path, and the entries added and superseded per section. When you write nothing, the report carries no learnings line.

A stop makes no commit. On a stop, also state that `SAI_LEARNINGS.md` is uncommitted: the terminal documentation commit of the run that completes takes it (`terminal-lifecycle.md` § 4).

Under `/sai-build`, hand these lines to the supervisor with the other apply results; its single stopped report prints them.
