# `/sai-direct-build`

## Command function

Builds a change from a stored change document in one unattended run, with no route picker and no questions. It runs the Direct Build route that [`/sai-explore`](sai-explore.md) offers as **Direct Build - Unattended**: it implements the document, reviews the result, reconstructs the specs, archives the change, and makes one local commit.

## Flags and behavior modifiers

- `--document-file <path> --document-hash <sha256>`: required. The document file and the hash that `sai-state block --export` returns for it. The document is the only input of the run.
- `--expert-review [no|auto|ask]`: answers the adversarial expert review question of the Direct Build checkpoint in advance. A bare flag is `auto`; any other value, or a second `--expert-review`, ends the run before anything is written with `Cannot start /sai-direct-build: --expert-review takes no, auto or ask.` The argument wins over the `expertReview.build` project setting; with neither, the run runs no checkpoint.

## In detail

The command checks the document file against the hash before it does anything else. A missing or unreadable file, a hash that does not match, or a retired `Ready to Propose` block ends the run with `Cannot start /sai-direct-build: the document file does not verify against --document-hash`, writes nothing, and starts no worker. A document without a `Change name:` line in its `## Change` section ends the run the same way.

After that the run follows the Direct Build coordinator that `/sai-explore` uses: the implementer works from the document, a review loop of up to three rounds corrects the diff, a gate runs the tests the implementer created or modified and the tests related to the diff, under the shared test-execution policy (the full suite only when the selection cannot be trusted; the routine full-suite run belongs to your CI), an optional adversarial expert review corrects the production files the run changed, the backfill and archive workers reconstruct and archive the change, and the run ends with the closing report. After the archive worker's clean result, the run checks the archive commit's footer against the archive plan's `closing_line` and amends that one local commit when the line is missing, appears earlier but not last, or sits beside another `Closes` line; a failed amendment reports the affected commit and ends the run without `Direct build done.`. A document that declares `Specs: none — <reason>` in `## Change` reconstructs no specs: the run writes only `proposal.md` and `.openspec.yaml` (with `skip_specs: true`) from the document, with no backfill worker, before archiving. The command is not [`/sai-build`](sai-build.md): it plans nothing, writes no `design.md` or `tasks.md`, and does not use the RED and GREEN workers.

Invoking the command is the consent to the delegated writes and the pre-authorization of one local commit, the archived change. The command makes no second commit, records no change telemetry, assigns no backlog item, and never pushes. An escalation that needs you goes through the native picker; a run that cannot reach you ends without the closing line.

The command ends with `Direct build done.` as the last line, only when the archive finished and its commit is confirmed. A stopped, cancelled, or unanswered run prints its report and ends without that line, so a caller that starts the command headless reads the missing line as an escalation. The [outcome benchmark](../benchmark.md) uses this command for the Direct Build route.
