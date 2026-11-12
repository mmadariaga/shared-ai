# `/sai-direct-build`

## Command function

Builds a change from a stored `Ready to Propose` block in one unattended run, with no route picker and no questions. It runs the Direct Build route that [`/sai-explore`](sai-explore.md) offers as **Direct Build - Unattended**: it implements the block, reviews the result, reconstructs the specs, archives the change, and makes one local commit.

## Flags and behavior modifiers

- `--block-file <path> --block-hash <sha256>`: required. The block file and the hash that `sai-state block --export` returns for it. The block is the only input of the run.

## In detail

The command checks the block file against the hash before it does anything else. A missing or unreadable file, or a hash that does not match, ends the run with `Cannot start /sai-direct-build: the block file does not verify against --block-hash`, writes nothing, and starts no worker. A block without a `Change name` line ends the run the same way.

After that the run follows the Direct Build coordinator that `/sai-explore` uses: the implementer works from the block, a review loop of up to three rounds corrects the diff, the project test suite runs once as a gate, the backfill and archive workers reconstruct and archive the change, and the run ends with the closing report. The command is not [`/sai-build`](sai-build.md): it plans nothing, writes no `design.md` or `tasks.md`, and does not use the RED and GREEN workers.

Invoking the command is the consent to the delegated writes and the pre-authorization of one local commit, the archived change. The command makes no second commit, records no change telemetry, assigns no backlog item, and never pushes. An escalation that needs you goes through the native picker; a run that cannot reach you ends without the closing line.

The command ends with `Direct build done.` as the last line, only when the archive finished and its commit is confirmed. A stopped, cancelled, or unanswered run prints its report and ends without that line, so a caller that starts the command headless reads the missing line as an escalation. The [outcome benchmark](../benchmark.md) uses this command for the Direct Build route.
