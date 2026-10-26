# `/sai-1-spec` coordinator

Fetch @sai/policies/public-chat.md and follow it exactly.
Fetch @sai/policies/remember.md
Fetch @skills/safe-operations/SKILL.md and use it.
Fetch @skills/budget/SKILL.md
Fetch @sai/policies/tool-resolution.md
Fetch @sai/policies/cache-warming.md
Fetch @sai/commands/plan/cycle.md and follow it for everything this card does not state.

You are the driver of the segment. The invocation carries one string, `arguments_value`: a `Ready to Propose` block, or the reference to one, or the name of an existing change followed by feedback.

## Goal

Write or refine the change's `proposal.md` and `specs/` with no human in the loop. The segment is done when both exist and satisfy the worker's verification, every mechanical check passes, the artifacts went through up to 3 incremental review rounds, and the segment's paths are committed locally (or left on disk when the project ignores them). A human is needed only for force majeure. The command stops before design: running `/sai-2-design` approves the specs.

## Start

1. Drop every `--fast-track` and `--supervised` token or line from `arguments_value`: both are accepted and ignored, and no banner is printed.
2. Find the input. A `--block-file <path>` with a `--block-hash <sha256>` (on separate lines or in either order) references a stored block; a pasted block is the text that holds the line `## Ready to Propose`. Exactly one block per run. Otherwise the first remaining token is a change name and the rest is feedback, and the change is startable when `openspec/changes/{name}/` holds `proposal.md` or a file under `specs/`. When there is no block and no startable change, print this and end the run, writing nothing: `Cannot start /sai-1-spec: creation needs a dispatchable Ready to Propose block (paste it, or pass --block-file and --block-hash), or the name of a change that already has proposal.md or specs/ followed by your feedback.`
3. The change name is the block's `**Change name**`, or the first token. A block for a change that already has `proposal.md` or a file under `specs/` is not a creation: print this and end the run, writing nothing: `Cannot start /sai-1-spec for {name}: it already has artifacts. Refine it with /sai-1-spec {name} followed by your feedback.`
4. Open the run per the cycle's Opening the run; inside `/sai-plan` it is already open. Emit `segment-start` with the segment `spec`, then `reset` `spec-steps@1`. Write a pasted block verbatim to `block.md` in the run directory, and the feedback verbatim to `feedback.md`.
5. Validate the block before any dispatch, so a malformed block costs nothing. Fetch @sai/policies/ready-to-propose-format.md for § Stored block transport and § Dispatchable contract. For a stored block, resolve `ready-to-propose.js` per `tool-resolution.md` and run `verify-file --block-file <path> --block-hash <hash>`; a missing, unreadable, or mismatched file ends the run. Then run `check --profile dispatchable --block-file <path>` against the block file. A structural violation (`"ok": false`) ends the run showing every violation with its block index, line number, problem, and detail; a degraded paste fails here too, and the user copies the block again from the `/sai-explore` output. When `judgment.pending` lists flagged lines, Fetch @sai/policies/block-hygiene-judgment.md, judge exactly those lines, save the verdicts as a JSON array in the run directory, and run `check --profile dispatchable --block-file <path> --verdicts-file <path>`; a `violation` verdict ends the run showing its clause, line number, and evidence. Proceed only when the verdict reports `"dispatchable": true`. A run that ends here prints the cause, writes nothing, and removes its run directory. A refinement run has no block to validate.
6. Record the commit paths' dirty baseline per the cycle's Commit rule.

## The segment

Fetch @sai/orchestration/workers/bindings/spec-worker.md and use it. Dispose the worker when the segment closes and on replacement, as the cycle's Warm and dispose says.

The worker is `sai-1-spec-proposal-worker`. Its steps, in the order the static fallback uses, are `spec-intake` (inline), then `research`, `proposal`, `specs`, `validation`, each at `sai/commands/spec/steps/{step}.md`. The task message opens with the first pointer, then names the change, the mode (`creation` with `block_file`, or `refinement` with `feedback_file`), the report path, and the run directory. When the refinement feedback is empty, the refinement task is to re-verify the artifacts and correct what the verification finds.

**Mechanical checks.** From the project root, through the budget executor: `openspec validate {name}`; `node <tool-path> {name}` for `check-delta-headers.js`; `node <tool-path> sai-1 {name} --cwd <project-root>` for `check-cited-paths.js`.

**Review criteria.** Fidelity to the input (on creation, the block's capabilities, constraints, edge cases, and in-scope implementation details each reach a requirement or scenario; on refinement, the feedback is applied and the intent of `proposal.md`'s What and Why survives); excess scope (no requirement, scenario, or capability beyond the input, and no out-of-scope implementation detail turned into a requirement); internal consistency (the proposal never contradicts a spec, every requirement has a scenario, terms match `GLOSSARY.md`); and consistency across artifacts (each capability the proposal lists has its delta spec, and no spec exists for an unlisted capability).

**Commit paths.** `openspec/changes/{name}/proposal.md`, the files under `openspec/changes/{name}/specs/`, `openspec/changes/{name}/.openspec.yaml`, and `GLOSSARY.md` when the worker changed it. Subject, for example: `docs(spec): add proposal and specs` on creation, `docs(spec): refine proposal and specs` on refinement.

## Close

Print, in this order: the worker's decision summary; every consistency warning of the validation report in the form `steps/validation.md` gives; the assumptions, each with its question, answer, and source (or that there are none); the findings still pending after the third review round (or that there are none); the scope observations when there are some; the checks that were skipped when there are some; and whether the paths were committed, committed in part, or left uncommitted because the project ignores them.

A segment that completed ends with exactly ``Spec done in openspec/changes/{name}/. Review it and run `/sai-2-design {name}` in a new chat when ready.`` A segment that failed, stopped, or ended on an unanswered escalation ends with its report and no closing line. Inside `/sai-plan` the segment prints its report and the plan coordinator's closing line replaces this one.
