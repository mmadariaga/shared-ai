# `/sai-plan` coordinator

Fetch @sai/policies/public-chat.md and follow it exactly.
Fetch @sai/policies/tool-resolution.md
Fetch @sai/policies/cache-warming.md
Fetch @sai/commands/plan/cycle.md

You chain the segments of one plan run in a single session. The invocation carries one string, `arguments_value`: a `Ready to Propose` block or the reference to one (`--block-file <path> --block-hash <sha256>`), or the name of a change, with the optional `--overview-lang <language>`.

## Goal

Turn a crystallized block into the full plan of a change with no human in the loop: `proposal.md` and `specs/` from `/sai-1-spec`, then `design.md`, `tasks.md`, and `interfaces.md` from `/sai-2-design`, each segment reviewed, checked, and committed on its own. A human is needed only for force majeure. The command stops before implementation.

## Start

1. Drop every `--fast-track` and `--supervised` token or line from `arguments_value`: both are accepted and ignored, and no banner is printed. Take `--overview-lang <language>` out and keep it for the design segment.
2. Find the input and the change name as `sai/commands/spec/coordinator.md` Start steps 2 and 3 do: a block gives the change name, and otherwise the first token is the name. Text after a name is not feedback here: feedback belongs to `/sai-1-spec` and `/sai-2-design`. When the string holds neither a block nor a name, print this and end the run, writing nothing: `Cannot start /sai-plan: pass a Ready to Propose block (paste it, or use --block-file and --block-hash), or the name of a change that already has proposal.md and specs/.`
3. Decide which segments run, from what `openspec/changes/{name}/` holds:
   - Both `proposal.md` and a file under `specs/` exist: the specs exist and the disk wins. The spec segment counts as done, the block (if one came) does not rewrite them, and the report says so.
   - Neither exists and the input is a block: the spec segment runs.
   - Neither exists and the input is a name: print this and end the run, writing nothing: `Cannot start /sai-plan for {name}: missing proposal.md and specs/. Pass the Ready to Propose block to create them.`
   - Only one of them exists: the change is partly present, which is neither a creation nor a complete set. Print this and end the run, writing nothing: `Cannot start /sai-plan for {name}: missing {the absent item}. Complete it with /sai-1-spec {name} followed by your feedback, then run /sai-plan {name}.`
4. Open the run once, per the cycle's Opening the run, with the key `plan-{name}`; the segments run inside it, and you close it.

## Segments

1. `/sai-1-spec`, when step 3 of Start says it runs: Fetch @sai/commands/spec/coordinator.md and follow it exactly as the first segment, with the block or its reference as `arguments_value`. Your Start opened the run, so it skips the opening in its own Start. It validates the block, runs the worker, the checks, and the review, and commits its own paths.
2. `/sai-2-design`: Fetch @sai/commands/design/coordinator.md and follow it exactly as the second segment, with `{name}` and the `--overview-lang` option as `arguments_value`. Its worker stamps the approval of the specs when it starts: invoking this command approves the specs. It writes the design artifacts, runs the checks and the review, generates the overview when asked, and commits its own paths.

No wrapper is entered again and no approval is asked between segments. The artifacts on disk are the only interface between them. Each segment disposes its own worker when it closes, as the cycle's Warm and dispose says, so no worker of a finished segment stays armed when the next one starts.

A segment starts only when the previous one completed, including a spec segment that counted as done. Review findings still pending after the third round do not stop the run: the design segment starts over specs with known holes, and the closing report lists them. When the spec segment fails, is stopped, or ends blocked (an escalation the user did not resolve), print its report and end the run without a closing line, and do not start the design segment. A change left with specs and no design continues with `/sai-2-design {name}` or another `/sai-plan {name}`.

## Close

After the last segment that ran ends, the reports it printed stand as the reports of the run. Each segment's own closing line is replaced by this command's.

- **Both segments completed** (or the spec segment counted as done and the design segment completed): say which artifacts were created, and end with exactly ``Plan done in openspec/changes/{name}/. Review it and run `/sai-build {name}` in a new chat when ready.``
- **A segment failed, was stopped, or ended on an unanswered escalation**: end the run with the reports printed so far and no closing line.

Close the run per the cycle's Closing the run.
