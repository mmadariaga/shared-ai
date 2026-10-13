# Published child identity transport

Explore calls this owner after a completed slice publication on any supported provider and before
its optional branch action or route picker. With no completed set publication,
there is no transport operation. This is provenance transport only: publication
confirmation remains owned by `to-backlog`; no implementation or assignment runs.
The protocol is identical in Claude Code and opencode.

Fetch @sai/policies/stage-machine.md and use its stored-block and amendment protocol.
Fetch @sai/policies/tool-resolution.md to locate `ready-to-propose.js`.
Fetch @sai/policies/block-hygiene-judgment.md for amendment validation.

1. Require the verified publication result's complete `correspondence`, with
   one child URL per recorded change name and the parent URL separately. Read
   every corresponding original block through `sai-state block <id> <name>`;
   a missing block or conflicting origin stops transport before route dispatch.
2. Call `ready-to-propose.js attach-origin` with JSON `{text, correspondence}`
   on stdin. `text` is the complete stored block set, not reconstructed work.
   Require `ok: true`. The tool inserts only each actual child URL as
   `**Backlog origin**`; it preserves the other bytes, dependencies, E/I items,
   constraints and scope. It refuses incomplete mappings or conflicting origins.
3. Validate all returned blocks with the dispatchable contract and bounded
   hygiene judgment, then persist each through the existing
   `sai-state emit <id> explore-slice@1 --ready-to-propose --amend <name> -`
   operation. Preserve the inventory and route state. The store recomputes the
   hashes; never patch the session file or reuse an old hash/verdict line number.
4. Re-read every amended block. Require its text/hash to equal the tool's amended
   output, and the validator-extracted `backlog_origin` to match the selected
   child correspondence. A rejection or
   partial transport remains pending: report it and wait for retry/stop before
   branch questions, route selection or any cold worker dispatch.

Later planning dispatch reads only these amended stored texts and hashes. Spec
persists the validated `backlog_origin` in the change's `.openspec.yaml` during
proposal creation; fresh standalone implementation reads that key and verifies
the actual child independently. Parent context never replaces child origin.
Manual handoff also uses the amended stored block, not the earlier displayed
pre-publication text; display the selected amended block for copying when that
route is chosen. This adds no planning or implementation dispatch.
