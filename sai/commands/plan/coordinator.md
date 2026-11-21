# `/sai-plan` coordinator

Fetch `@sai/policies/public-chat.md` and follow it exactly.
Fetch `@sai/policies/tool-resolution.md`
Fetch `@sai/policies/cache-warming.md`
Fetch `@sai/policies/change-telemetry.md`
Fetch `@sai/commands/plan/cycle.md`

You chain the segments of one plan run in a single session. The invocation carries one string, `arguments_value`: a `Ready to Propose` block or the reference to one (`--block-file <path> --block-hash <sha256>`), or the name of a change, with the optional `--publish yes|no`.

## Goal

Turn a crystallized block into the full plan of a change with no human in the loop: `proposal.md` and `specs/` from `/sai-1-spec`, then `design.md`, `tasks.md`, and the interface stubs and failing tests of the whole change (the plan tests) from `/sai-2-design`, each segment reviewed, checked, and committed on its own. A human is needed only for force majeure. The command stops before implementation.

## Start

1. Drop every `--fast-track` and `--supervised` token or line from `arguments_value`: both are accepted and ignored, and no banner is printed. Any `--overview-lang` token is an unknown option now: print `Cannot start /sai-plan: unknown option --overview-lang.` and end the run before anything is written. Take `--publish <answer>` out and keep it for the publication answer below; an answer other than `yes` or `no`, or a missing one, ends the run before anything is written with: `Cannot start /sai-plan: --publish takes yes or no.`
2. Find the input and the change name as `sai/commands/spec/coordinator.md` Start steps 2 and 3 do: a block gives the change name, and otherwise the first token is the name. Text after a name is not feedback here: feedback belongs to `/sai-1-spec` and `/sai-2-design`. When the string holds neither a block nor a name, print this and end the run, writing nothing: `Cannot start /sai-plan: pass a Ready to Propose block (paste it, or use --block-file and --block-hash), or the name of a change that already has proposal.md and specs/.`
3. Decide which segments run, from what `openspec/changes/{name}/` holds:
   - Both `proposal.md` and a file under `specs/` exist: the specs exist and the disk wins. The spec segment counts as done, the block (if one came) does not rewrite them, and the report says so.
   - `proposal.md` exists, `specs/` holds no file, and `.openspec.yaml` sets `skip_specs: true`: the change has no specs by declaration. The spec segment counts as done and the report says so.
   - Neither exists and the input is a block: the spec segment runs.
   - Neither exists and the input is a name: print this and end the run, writing nothing: `Cannot start /sai-plan for {name}: missing proposal.md and specs/. Pass the Ready to Propose block to create them.`
   - Only one of them exists: the change is partly present, which is neither a creation nor a complete set. Print this and end the run, writing nothing: `Cannot start /sai-plan for {name}: missing {the absent item}. Complete it with /sai-1-spec {name} followed by your feedback, then run /sai-plan {name}.`
4. Open the run once, per the cycle's Opening the run, with the key `plan-{name}`; the segments run inside it, and you close it.

## Publication answer

A run publishes a draft PR/MR of its plan only when it holds a `yes` answer, and it asks the user at most once, here, so nothing after this point waits for a human. The answer is the held confirmation for the three local and remote operations of `@sai/commands/plan/publication.md` on this exact branch and request, in the sense of `safe-operations`: the plan-document commit, the non-force push of the branch, and the creation or update of its request. It authorizes nothing else.

Resolve it once, after the input checks have passed (Start steps 2 and 3, and, when the spec segment runs, the block validation of its Start step 5) and before the first worker is created, so a run that ends at those checks asks nothing. When the spec segment counts as done, resolve it right after Start step 4. The first of these that yields a value is the answer, and nothing after it is asked. An explicit `--publish` value wins over the recorded answer and replaces it:

1. The `--publish yes|no` argument.
2. The answer recorded in the run state: the `publication` field of the `run` view of `plan-run@1`. Without a `--publish` argument a resumed run reuses it and asks nothing. A resumed run with no recorded answer goes on to the next source.
3. The `pr.publishAfterRun` setting, read with `node <tool-path> get pr.publishAfterRun --json --cwd <project-root>` (`project-settings.js`, resolved per `tool-resolution.md`) when it returns `yes` or `no`. Print its `warnings` verbatim, one line each. `ask`, an absent key, an invalid value, and a tool that cannot run leave the question normal.
4. The question below.

Record the answer with `emit <id> plan-run@1 --set kind=publication --set value=<yes|no>`, so every later read of the run state returns it. When `--publish` differs from the answer already recorded by an earlier session of this run, the emit replaces the recorded answer, and the closing report says that the argument replaced it. When it equals the recorded answer, nothing is said.

**The question.** Ask it through Claude Code's `AskUserQuestion` or opencode's `question`, with the same text and options on both. Read the current branch (`git symbolic-ref --quiet --short HEAD`) and its remote (`git config branch.<branch>.remote`, else the only remote that `git remote` lists), and name them, so that a `yes` confirms that exact operation: `Publish a draft PR/MR of the plan for {name} when this run ends? Branch {branch}, remote {remote}. A new request is created as a draft; an open request of this branch is updated and keeps its draft or ready state. The plan documents are committed on this branch, the branch is pushed without force, and nothing asks you again.` Options: `Publish draft plan`, `Do not publish`. `Publish draft plan` is `yes`. `Do not publish` and a cancelled question are `no`. A detached HEAD has no branch to name: ask nothing, record no answer, and say in the closing report that nothing is published because HEAD is detached. When the remote cannot be read, say so in the question instead of a remote name.

**No answer is a no.** A run that fails, is stopped, or ends on an unanswered escalation publishes nothing, whatever the answer.

## Segments

1. `/sai-1-spec`, when step 3 of Start says it runs: Fetch `@sai/commands/spec/coordinator.md` and follow it exactly as the first segment, with the block or its reference as `arguments_value`. Your Start opened the run, so it skips the opening in its own Start. It validates the block, runs the worker, the checks, and the review, and commits its own paths. Resolve the publication answer between its Start step 5 and the creation of its worker.
2. `/sai-2-design`: Fetch `@sai/commands/design/coordinator.md` and follow it exactly as the second segment, with `{name}` as `arguments_value`. Its worker stamps the approval of the specs when it starts: invoking this command approves the specs. It writes the design artifacts, has the plan RED worker write the stubs and the failing tests, runs the checks and the review, and commits its own paths in two commits (the documents, then the plan code).

No wrapper is entered again and no approval is asked between segments. The artifacts on disk are the only interface between them. Each segment disposes its own worker when it closes, as the cycle's Warm and dispose says under `worker-lifecycle.md`, so no worker of a finished segment stays alive when the next one starts.

A segment starts only when the previous one completed, including a spec segment that counted as done. Review findings still pending after the third round do not stop the run: the design segment starts over specs with known holes, and the closing report lists them. When the spec segment fails, is stopped, or ends blocked (an escalation the user did not resolve), print its report and end the run without a closing line, and do not start the design segment. A change left with specs and no design continues with `/sai-2-design {name}` or another `/sai-plan {name}`.

## Close

After the last segment that ran ends, the reports it printed stand as the reports of the run. Each segment's own closing line is replaced by this command's.

**Telemetry.** Before publication and any closing line, and before the run is closed (its run directory still holds the review round files), record the change telemetry as `change-telemetry.md` says, with `--command sai-explore-plan` when this coordinator runs inside the `/sai-explore` **Plan - Unattended** route and `--command sai-plan` otherwise, and `--run-dir` set to the run directory. Its one line, when it has one, comes before the closing line.

- **Both segments completed** (or the spec segment counted as done and the design segment completed): say which artifacts were created and close the planning report with exactly ``Plan done in openspec/changes/{name}/. Review it and run `/sai-build {name}` in a new chat when ready.`` This literal closes the planning report, not the command interaction.
- **A segment failed, was stopped, or ended on an unanswered escalation**: end the run with the reports printed so far and no closing line, and publish nothing.

**Publication.** With both segments completed and the answer `yes`, publish after the last local commit of the run, the telemetry commit included, and before the closing line: Fetch `@sai/commands/plan/publication.md` and follow it with the change name. It runs unattended and asks nothing. Print its one-paragraph outcome with the reports: the request URL it verified, or the reason nothing was published (detached HEAD, default branch, no provider or remote, failed authentication, a rejected push, a merged or closed request of the branch). A publication that fails or is skipped never stops the run and never changes its outcome: planning stays completed, any confirmed commit or push stays, and nothing is retried with force. With the answer `no`, or without an answer, nothing is published and nothing is asked. Explore's **Plan - Unattended** route follows this same Start, so the question reaches the user inside that route when no `--publish` was handed over.

Close the run per the cycle's Closing the run after the closing line.
