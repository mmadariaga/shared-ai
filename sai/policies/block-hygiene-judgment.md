# Block Hygiene Judgment

The bounded judgment of the dispatchable `Ready to Propose` contract. The deterministic tool `sai/tools/ready-to-propose.js` (`check --profile dispatchable`) reports the lines a lexical pre-filter flagged, as `{block, line, clause}`; it cannot tell requested work from subject matter, because a change about `/sai-commit` legitimately mentions git. This judgment decides, for each flagged line and nothing else, whether the line asks the implementer to do something forbidden or only describes the change's subject. Consumed by reference from the crystallization close and from `/sai-1-spec` creation intake; never restated there.

## Clauses

The block hygiene clauses are the four things a block must not request as implementation work. The ids below are the tool's `HYGIENE_CLAUSES` ids and are the only ids a verdict may carry:

- `planning-artifact` — creating the planning artifacts `design.md`, `tasks.md`, or `implementation.md`.
- `mutating-git` — running a mutating git command (add, commit, push, branch, tag, stash, reset, rebase, merge, and the like).
- `subagent-dispatch` — dispatching subagents.
- `published-spec-edit` — editing published specs under `openspec/specs/**` directly as implementation work; a published spec changes only through the change's delta, backfill, and the archive sync.

Every other repository artifact, anywhere under `openspec/` included, is ordinary implementation scope.

## Judging a flagged line

For each flagged line, read that line in the context of its section and decide with one verdict:

- `context` — the line describes the change's subject, motivation, a constraint, an exclusion, or an existing behavior. A mention is not a request: a line that says the change documents commit messages, forbids a push, or cites a spec as evidence is `context`.
- `violation` — the line asks the implementer, as work of this change, to perform the action the clause names. When the line is ambiguous between the two readings, the verdict is `violation`.

Judge only the flagged lines; never re-judge, add, or skip a line, and never judge a line the tool did not flag. A verdict records its evidence: one short sentence quoting or naming what in the line decided it. Evidence is mandatory for both verdicts.

## Verdict shape

One JSON object per flagged `(line, clause)` pair, collected in one array:

```
{"clause": "<clause id>", "line": <line number reported by the tool>, "evidence": "<one sentence>", "verdict": "violation|context"}
```

The array travels on stdin after a line equal to `<<<VERDICTS>>>`, below the block set, to `sai-state emit --ready-to-propose` or to `ready-to-propose.js check --profile dispatchable`. Compose this boundary mechanically with `ready-to-propose.js compose --block-file <path> --verdicts-file <path>` per `ready-to-propose-format.md` § Block and verdict delivery, for registration and amendment alike. The tool matches verdicts to flagged lines by `line` and `clause`; a missing verdict, a verdict for a line the tool did not flag, and a malformed verdict each leave the set undispatchable. A block set is dispatchable when it is structurally valid and every flagged line carries a `context` verdict. Line numbers refer to the exact text sent: after any edit of the block, run the tool again and judge again.

## Violation handling

A `violation` verdict means the block cannot be dispatched. Show the clause, the line number, and the evidence. The author of the block corrects the line (or, in `/sai-1-spec`, the user re-copies a corrected block) and the set is validated again from the start.
