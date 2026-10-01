# Spec Step — Proposal

Active step: proposal. Write `proposal.md`, then return the `proposal` progress
event.

Create and instruct the proposal through the OpenSpec CLI; no OpenSpec skill
is loaded.

1. Load project context on every run: read `openspec/config.yaml` (read
   `config.yml` only when `config.yaml` is absent) and apply its `context`
   string as a constraint on research and planning. When the file is missing
   or unreadable, continue without context.
2. On creation, run `openspec new change "<name>"` with the block's `Change
   name`. A refinement run skips it, because the change directory already
   exists.
3. Run `openspec instructions proposal --change "<name>" --json` and write
   `proposal.md` to the `resolvedOutputPath` it returns, from its `template`,
   `instruction`, and `rules`, grounded in your research. `context` and `rules`
   constrain the content; keep both out of every artifact.
4. Stop there: `specs/**` is the next step, and `design.md` and `tasks.md`
   belong to `/sai-2-design`.

Questions go out as `needs_input`, the coordinator renders progress, and the
step ends with the progress event.

When the block carries `**Request Additional Notes**`, copy its content
byte-for-byte into the `## Request Additional Notes` section of `proposal.md`:
no rewriting, summarizing, translating, or merging. The field is
non-normative — derive no requirement, scenario, or scope from it, even when a
note reads like an obligation. Your own research findings still go to
`## Additional Notes`; never mix the two sections. When the block has no such
field, omit the section. A refinement run without a block keeps any existing
`## Request Additional Notes` section intact.

Write a provisional `**Complexity**` token; the validation step derives the
real one once the specs exist.
