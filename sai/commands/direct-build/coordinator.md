# `/sai-direct-build` coordinator

Fetch `@sai/policies/public-chat.md` and follow it exactly.
Fetch `@sai/policies/tool-resolution.md`
Fetch `@sai/policies/cache-warming.md`
Fetch `@sai/policies/worker-lifecycle.md`
Fetch `@sai/policies/ready-to-propose-format.md` for § Stored block transport.

You are the driver of one Direct Build run and its only user-facing voice. The invocation carries one string, `arguments_value`: the reference to a stored `Ready to Propose` block, `--block-file <absolute path> --block-hash <sha256>`, on separate lines or in either order. The verified block file is the only substantive input of the run. This command is not `/sai-build`, and it is not entered through `/sai-explore`: it runs the Direct Build route of `/sai-explore` for one block, headless, with no route picker and no slice machine.

## Goal

Turn the block into implemented, reviewed code, backfilled specs, an archived change, and one local commit, in one session and with no human in the loop. The run is done when the archive worker's execute order returned a clean `completed` result and the commit is confirmed. The command closes with the literal `Direct build done.` only then: any other ending, a stop or an escalation nobody answered, prints its report and ends without that line. The missing line is the signal a caller reads to tell an escalated run from a completed one. A human is needed only for force majeure.

Invoking the command consents to the delegated writes of the Direct Build route and pre-authorizes exactly one local commit: the archived change. It authorizes no push and no other commit.

## Start

1. Drop every `--fast-track` and `--supervised` token or line from `arguments_value`: both are accepted and ignored, and no banner is printed.
2. Find the reference: exactly one `--block-file <path>` and one `--block-hash <sha256>`. When either is missing or repeated, or the string holds anything else (a pasted block, a change name, another option), print this and end the run, writing nothing: `Cannot start /sai-direct-build: pass --block-file <path> and --block-hash <sha256> (the pair that sai-state block --export returns).`
3. Verify the block as § Stored block transport says: resolve `ready-to-propose.js` per `tool-resolution.md` and run `verify-file --block-file <path> --block-hash <hash>`. A file that is missing, unreadable, unsafe, or does not match the hash ends the run, the same as `/sai-plan` does: print `Cannot start /sai-direct-build: the block file does not verify against --block-hash ({problem}).` with the tool's problem, write nothing, and dispatch nothing. Never rebuild the block from chat.
4. Read the change name from the verified file's `**Change name**` line. A block without one ends the run the same way, naming the missing line.
5. Follow the run below with the verified pair.

## The run

Fetch `@sai/commands/explore/direct-build-coordinator.md` and follow it exactly as this command's run, with `arguments_value` holding the same two lines. Wherever the card says "the explore session", read this coordinator. This command is the card's block provider, and it differs from `/sai-explore` in these points only:

- **Block provider.** The verified pair of Start serves every dispatch of the card, the backfill preparation and any replacement worker included. Nothing is exported, because there is no `sai-state` store. The block file stays in place for the whole run, and it is not closed or removed by this command: its caller owns it.
- **No explore state.** The card's mentions of `sai-state`, the route entries, `explore-slice@1`, the slice machine, the idea list, and the `{intent: ...}` events do not apply, and the card's Resume does not apply: a new invocation starts from Start. `active_change` is the change name of the block.
- **No assignment.** Skip `backlog-implementation-start.md` in Step 1. This command performs no remote operation, and the block's `Backlog origin` stays provenance for the backfill and the archive.
- **One commit.** The card's two-commit grant is cut to the archived change. Record no change telemetry and make no second commit; the card's Change telemetry paragraph does not run, and the report says no telemetry was recorded.
- **Unattended.** An escalation of the card follows `@sai/policies/obstacle-escalation.md` through the native picker. A run that cannot reach a user, or whose question is dismissed, ends as an unanswered escalation: the stop report is printed and the closing literal is not.

## Close

The run closes when the card's goal is met, when a stop was reported, or when the user chose to stop or dismissed an escalation. Dispose every worker and helper still alive under `worker-lifecycle.md` before the report, in every outcome, then close with the card's terminal report, following `@sai/policies/implementation-closing-report.md`.

Only when the archive worker returned a clean `completed` result and the archive commit is confirmed, print this as the last line of the output, alone on its line and with nothing after it: `Direct build done.`

Print no closing line after a stop, a cancellation, or an escalation. The report names what completed and what remains, and a stopped run keeps its retry guidance in the `Next step` section.
