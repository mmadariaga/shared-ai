# Published child identity transport

Explore calls this owner after a completed slice publication on any supported provider and before
its optional branch action or route picker. With no completed set publication,
there is no transport operation. This is provenance transport only: publication
confirmation remains owned by `to-backlog`; no implementation or assignment runs.
The protocol is identical in Claude Code and opencode.

Fetch `@sai/policies/stage-machine.md` and use its stored-document and amendment protocol.
Fetch `@sai/policies/tool-resolution.md` to locate `change-document.js`.
Fetch `@sai/policies/block-hygiene-judgment.md` for amendment validation.

1. Require the verified publication result's complete `correspondence`, with
   one child URL per recorded change name and the parent URL separately. Read
   every corresponding original document through `sai-state block <id> <name> --export --harness <claude|opencode>`;
   a missing document or conflicting origin stops transport before route dispatch.
2. Call `change-document.js attach-origin --harness <claude|opencode>` with JSON
   `{document_files: [{document_file, hash}], correspondence}` in `--input-file <path>` per `@sai/policies/tool-resolution.md` § Invocation (structured input is an input file). Supply all
   exported references, not document text. The tool verifies each file, reads and
   updates the set mechanically, and returns new private `document_file`/`hash`
   references with their `transfer_dir`, not amended text for model copying.
   Require `ok: true`. The tool inserts only each actual child URL as
   the `Backlog origin:` line of `## Change`; it preserves the other bytes, dependencies,
   E/I items, and scope. A document whose origin is the set's parent (an adopted
   originating issue) gets its child URL in that place. It refuses incomplete
   mappings or any other conflicting origin.
3. Validate each returned file with the dispatchable contract and bounded
   hygiene judgment. Save its verdicts in a separate JSON-array file and use
   `sai-state emit <id> explore-slice@1 --amend <name> --document-file <new path> --verdicts-file <path>`
   operation. Preserve the inventory and route state. The store recomputes the
   hashes; never patch the session file or reuse an old hash/verdict line number.
4. Export every amended document again. Require its file bytes/hash to equal the tool's amended
   output through a mechanical comparison, and the validator-extracted `backlog_origin` to match the selected
   child correspondence. A rejection or
   partial transport remains pending: report it and wait for retry/stop before
   branch questions, route selection or any cold worker dispatch.

Retain all export and amended-output directories until continuations and recovery
no longer need them, then close them through `transfer.js close`. Later planning
dispatch uses only fresh amended stored-file/hash references under
`issue-format.md` § Change document (Transport). Spec
persists the validated `backlog_origin` in the change's `.openspec.yaml` during
proposal creation; fresh standalone implementation reads that key and verifies
the actual child independently. Parent context never replaces child origin.
Manual handoff also uses the amended stored document, not the earlier displayed
pre-publication text; display the selected amended document for copying when that
route is chosen. This adds no planning or implementation dispatch.
