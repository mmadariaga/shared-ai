<!-- Format validator: node sai/tools/ready-to-propose.js check --profile dispatchable < text (dispatchable profile; also via node sai/tools/lint.js ready-to-propose <file>) -->

# Ready to Propose Block Format

Canonical structure for the `Ready to Propose` block, emitted by explore's crystallization protocol (`sai/commands/explore/steps/crystallization-protocol.md`) and by `/sai-3-implement`'s escalation handoff, and consumed by `/sai-1-spec`. Consumed by reference; never restated at a consuming surface.

## Block structure

The block is structured as follows:

```
## Ready to Propose

**Change name**: <kebab-case suggestion>
**Depends on**: <comma-separated immediate dependency change names, or None>
**Backlog origin**: <selected canonical GitHub, GitLab or Azure DevOps child URL; omit without issue provenance>
**What**: <1–2 sentences describing the change>
**Why**: <1–2 sentences stating the motivation; optional inline file:line provenance citations when the hypothesis was grounded in specific files>
**Capabilities in scope**:
- <capability>: <brief description>
**Research Leads**:
- <repository-relative-path[:start-end]> - <concise relevance note>
**Decisions & Rationale**: <optional inline file:line provenance citations when a decision was grounded in specific files>
- <decision and rationale, or None>
**Alternatives Considered**:
- <rejected alternative, or None>
**Trade-offs Accepted**:
- <accepted trade-off, or None>
**Model / Re-framings**:
- <model re-framing, or None>
**Key constraints**:
- <constraint or non-goal>
**Terms**:
- <agreed term: definition, or None>
**Edge Cases**:
- <agreed `E1`…`En` behavior statement, or None>
**Implementation Details**:
- <in-scope `I1`…`In` statement in order, or None>
**Out of scope Implementation Details**:
- <out-of-scope `I1`…`In` statement in order, or None>
**Request Additional Notes**:
<optional free Markdown: paragraphs or bullets>
**Overview language**: <explicit `--overview-lang` option value or literal None>

---
```

## Mandatory sections

The five sections between `**Capabilities in scope**` and `**Key constraints**` are mandatory. When a section has no content, emit a single `- None` bullet:
- `**Research Leads**`
- `**Decisions & Rationale**`
- `**Alternatives Considered**`
- `**Trade-offs Accepted**`
- `**Model / Re-framings**`

`**Out of scope Implementation Details**` is also mandatory: every block carries it immediately after `**Implementation Details**`, as exactly `- None` when no item is out of scope.

`**Implementation Details**` carries exactly `- None` when no technical decision qualifies, in a single change only: the user confirmed that empty list at the `Implementation details` stage. Every slice of a sliced set carries at least one in-scope item.

Sections follow the block order above; `**Overview language**` is the last line before the `---` separator.

## Dispatchable contract

One contract makes a block valid for every route that consumes it — Plan - Unattended, Direct Build - Unattended, and Manual — so choosing a route never fails on block shape. A block is dispatchable when it passes the `dispatchable` profile of `sai/tools/ready-to-propose.js` (this format, plus the implementation item rules: `- None` for a single change, each `I` exactly once per block, every `I` in scope of at least one slice of a sliced set, and at least one in-scope item per slice of a sliced set) and each line the tool's lexical pre-filter flags carries a `context` verdict from the bounded judgment in `@sai/policies/block-hygiene-judgment.md`. That policy owns the four block-hygiene clauses: a block never requests planning-artifact creation, a mutating git command, subagent dispatch, or direct edits to `openspec/specs/**` as implementation work. The tool computes each block's sha256 hash and is the single source of the clause ids.

`**Request Additional Notes**` is optional and sits outside the mandatory sections: when present it follows `**Out of scope Implementation Details**` and immediately precedes `**Overview language**`; when it has no content it is omitted entirely — no label, no `- None`.

## Stored block transport

Plan - Unattended and Direct Build - Unattended dispatch a block only from the `sai-state` store. In Claude Code and opencode, run `sai-state block <id> <change-name> --export --harness <claude|opencode>` and send the returned `block_file` and `hash` together as `--block-file <absolute path>` and `--block-hash <sha256>` envelope lines. The tool writes the stored text directly into a private transfer file under the active harness temp root; no model copies its content into a message or heredoc.

Every receiving worker, including direct implementation, backfill prepare, and supervised specification, verifies before dependent work:

1. Require both envelope lines. Resolve `ready-to-propose.js` per `@sai/policies/tool-resolution.md` and run `node <tool-path> verify-file --block-file <path> --block-hash <hash>`.
2. On a missing, unreadable, unsafe, or mismatched file, return `failed` with no changes, naming the problem. Never reconstruct or repair the block from chat. Read the verified file as the sole block input only after success.

Export anew after every amendment and before every fresh dispatch or replacement; carry the new file and its hash as one reference. Retain transfer directories while any continuation or recovery may need them, and close them with `transfer.js close --dir <dir>` only after that possibility ends. A previous file is never paired with a new hash. Existing LF-normalized block hashing remains unchanged: separators and non-ASCII content remain significant, and transport preserves the stored bytes, including the absence of a final newline.

### Block and verdict delivery

For both registration and amendment, author or update block content in a UTF-8 file and keep judgment verdicts in a separate JSON-array file. Run `sai-state emit <id> explore-slice@1 --ready-to-propose [--amend <name>] --block-file <path> --verdicts-file <path>`. It calls the shared `ready-to-propose.js` composer internally, avoiding shell text re-encoding in both Bash and PowerShell. Composition failure returns `BLOCK_COMPOSITION_FAILED` without a store mutation. The composer inserts the newline before `<<<VERDICTS>>>` mechanically, outside the hashed block, and rejects incomplete blocks and invalid or incomplete verdicts; the parser still requires a separate marker line. Use `[]` when no line needs judgment. Never concatenate a marker onto a stored separator or transcribe a stored block to attach verdicts. The same composer is available as `node <tool-path> compose --block-file <path> --verdicts-file <path>` when a caller needs its composed stdout.

The Manual route has no store and no hash.

## Field rules

- **Depends on**: inside the block immediately after Change name; required for newly emitted slices (None for an independent slice). Older blocks without it mean no dependencies. Use real immediate dependencies only, separated by commas; branch ancestry adds no edges. `validateDependencies` in `ready-to-propose.js` checks one block's syntax, duplicates, and self references without demanding external slices. `validateDependencySet` additionally checks existing references and cycles and returns stable blocker-first order. Producers validate the complete set before storage, display, amendment, or publication; contradictions that need an agreement change go to the user. Never invent or delete agreed edges to pass validation. The line is stored and hashed with the block.
- **Backlog origin**: optional issue identity carried with the separately delivered slice, after Depends on when present. It is provenance, not remote-mutation authority. Retain the selected child URL, not its parent context URL. After a completed set publication, `backlog-origin-transport.md` attaches the actual child identities to stored blocks through validated amendments and recomputed hashes before planning dispatch. The validator returns the canonical `backlog_origin`; Spec preserves it under `.openspec.yaml`'s `backlog_origin`; implementation coordinators independently verify the selected child and parent before assignment.

- **Change name**: kebab-case suggestion
- **What**: 1–2 sentences describing the change
- **Why**: 1–2 sentences stating the motivation; may carry optional inline `file:line` or `path:startLine-endLine` provenance citations as evidence for intent, including references to `openspec/changes/{name}/**` or `openspec/specs/**`
- **Capabilities in scope**: the user-facing boundaries for this run; OpenSpec bookkeeping artifacts (`openspec/changes/{name}/**`, `openspec/specs/**`) are excluded — they are consequences owned by backfill and archive
- **Research Leads**: non-authoritative starting points for later investigation — concise repository-relative `path` or `path:start-end` entries with short relevance notes, which may point into OpenSpec artifacts; emits exactly `- None` when no useful lead exists; a lead SHALL NOT designate a file to modify, define implementation scope, or replace provenance
- **Decisions & Rationale**: may carry the same optional provenance citations as **Why**, including OpenSpec references
- **Alternatives Considered**: rejected alternatives or None
- **Trade-offs Accepted**: accepted trade-offs or None
- **Model / Re-framings**: model re-framings or None
- **Key constraints**: constraints and non-goals of the change's own behavior and scope
- **Terms**: agreed terms fixed before edge cases, each as `term: definition`; emits exactly `- None` when no term was agreed; conversation-only agreement, never a file write
- **Edge Cases**: agreed `E1`…`En` behavior statements in their established order, or exactly one `- None` bullet when the agreed list is empty
- **Implementation Details**: the in-scope agreed `I1`…`In` statements — the items this block's change needs — in their established global order with identifiers and wording preserved. A single change carries exactly `- None` when the user confirmed that no technical decision qualifies; the I-list holds technical decisions about how to implement, not tasks, so what to build travels in the request, `**Edge Cases**`, and `**Capabilities in scope**`. Every slice of a sliced set owns at least one in-scope item, and every `I` is in scope of at least one slice; a shared `I` may stay in scope of several slices. `wording preserved` means identifiers and order, not source language, and does not block translation under the crystallization language gate. In a non-sliced block every agreed item is in scope.
- **Out of scope Implementation Details**: every other agreed `I1`…`In` statement — items owned by an earlier or a later slice — under the same field rules (global order, identifiers, and wording preserved), or exactly one `- None` bullet when no item is out of scope (always in a non-sliced block). Within one block each identifier appears exactly once, in exactly one of the two sections, and together the two sections cover the full agreed list. This section is non-normative context for the receiving change: no requirement, scenario, intent item, or implementation obligation derives from it.
- **Request Additional Notes**: optional, free-form, non-normative Markdown (paragraphs or bullets) carrying discussed, agreed context that could influence implementation and fits no other field. Examples of what it holds, not an exhaustive list:
  - future behavior the conversation agreed on but excluded from this change;
  - related follow-up work, such as PBIs or tickets;
  - any other agreed context of this kind, including points the conversation left explicitly undecided.

  A non-goal and its detail are two facts. The non-goal is a binding exclusion of this change and goes to `**Key constraints**`; its detail (how the excluded behavior should work later) is context and goes here. The pair is not duplication. Likewise, a requirement that describes future behavior outside this change goes here as future context; an obligation of this change goes to `**Edge Cases**`, `**Implementation Details**`, or `**Key constraints**`.

  **Open decisions.** An open decision is a behavior the exploration left undefined. This field is the single place of the block where an open decision travels: each one is its own `Undecided:` sentence that states the undefined behavior and names the `E<n>` or `I<n>` item it affects, when one exists. Every other field states decided behavior only.

  **Emission sweep**, run before the block is printed: the sweep is complete when every discussed-and-excluded topic whose detail goes beyond its non-goal in `**Key constraints**` has that detail in `**Request Additional Notes**`, and every `**Key constraints**` line constrains the change. When no content meets this criterion or the definition above, omit the field.

  Guardrails, each with its target:
  - carry each fact once, in the field that owns it: this field takes only context that no other field states;
  - emit the field with content, or omit it entirely; an empty field or a `- None` bullet is never emitted;
  - in a sliced crystallization set, each per-slice block sweeps only its own slice's content and carries only its own slice's notes, or omits the field;
  - `/sai-3-implement`'s escalation block may include the field but is not required to.

  Illustrative example (generic, not required wording):

  ```
  **Key constraints**:
  - Report archiving is out of scope for this change.
  **Request Additional Notes**:
  Future scope, outside this change: an archived report becomes read-only, keeps its owner, and is purged after the retention period; a follow-up ticket tracks this work. Undecided: whether an administrator can restore an archived report.
  ```

  Consumers treat it as informative context only: no requirement, scenario, or mandatory scope derives from it. `/sai-1-spec` and backfill copy it verbatim (no rewriting, summarizing, translating, or merging) into the dedicated `## Request Additional Notes` section of `proposal.md`, kept separate from `## Additional Notes`.
- **Overview language**: the explicit `--overview-lang` option value or literal None; reflects only what is knowable at print time, so a gate-9-selected value never appears in an already-emitted block

Provenance citations are optional: with nothing to cite, **Why** and **Decisions & Rationale** carry no citation placeholder. Provenance is evidence for intent only and SHALL NOT designate files to modify; the block has no target-file field.
