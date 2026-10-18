# Issue origin preservation

Apply the same protocol in Claude Code and opencode. `Backlog origin` in a
Ready to Propose block and `backlog_origin` in `.openspec.yaml` carry the selected
change's issue URL, never a parent substituted for a child.

Accept provenance from an imported issue, verified conversation evidence, or a
valid origin already in the selected change's metadata. Validate a block's URL
with `ready-to-propose.js`'s dispatchable check. For a metadata-only input, use
that validator's existing canonical URL check:
`backlog-slice-identity.normalize(value, backlog-slice-identity.platformFor(value))`
must equal the received value. Resolve these tool modules through
`tool-resolution.md`; remote identity verification remains with the existing
provider workflow.
Retain a valid existing origin when no new origin is supplied. Conflicting
origins are not permission to overwrite either one: retain the existing valid
value, warn, and continue without assigning new closing intent.

For a published slice set, use `backlog-origin-transport.md`'s validated
`attach-origin` and amendment protocol with the verified child correspondence.
For an imported single issue, include its verified URL when creating the block.
If that block was already prepared, read it from the store, add only its
`Backlog origin` field, run the existing dispatchable check and bounded hygiene
judgment, then submit it through `sai-state emit`'s existing
`--ready-to-propose --amend <name>` operation. Re-read the amended block with
`sai-state block <id> <change-name> --export --harness <claude|opencode>` and
check its extracted origin and the refreshed `hash` it returns before dispatch;
when the export returns `BLOCK_EXPORT_FAILED` or `BLOCK_NOT_FOUND`, stop before
dispatch. Never patch
the session file or reuse a pre-amendment hash. This amendment uses the same
block field and validation mechanism, not a separate origin envelope.

At each handoff where an origin is known, compare the received origin with the
outgoing block or metadata: planning output, backfill draft, materialized
metadata, and the archived `.openspec.yaml`. Read both sides of an archive move;
do not assume the CLI drops metadata. Preserve the value through the existing
metadata write owner, not through a second transport field. A missing or
unverifiable origin is non-blocking: warn with the change name and affected
handoff, continue the remaining work, and omit unsupported closing intent.
Do not invent a URL from a branch identifier or an ordinary `Refs` mention.
When no issue association was ever known, omit the key silently.

Archive commit messages consume the archived value through `commit-rules.md`
§ Closing Lines. The pull request tool consumes those commit closing lines;
its existing provider/host restrictions, repository-qualified identities,
parent-completeness check, and preservation of manual text remain in force.
This policy adds no Azure Boards closing-reference support.
