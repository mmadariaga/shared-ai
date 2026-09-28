# Spec Step — Proposal

Active step: proposal. Write `proposal.md`, then return the `proposal` progress
event.

Fetch @skills/openspec-propose/SKILL.md

That skill proposes a whole change in one pass. This step uses only its
mechanics for the proposal artifact:

1. Load project context (the skill's step 2) on every run. On creation, then
   create the change with the block's `Change name` (its step 4); a refinement
   run skips that, because the change directory already exists.
2. Run `openspec instructions proposal --change "<name>" --json` and write
   `proposal.md` from its `template`, `instruction`, and `rules`, as the
   skill's step 6a describes, grounded in your research.
3. Stop there: `specs/**` is the next step, and `design.md` and `tasks.md`
   belong to `/sai-2-design`.

Where the skill and this phase differ, this phase wins: questions go out as
`needs_input`, the coordinator renders progress (so skip the skill's todo list
and its `Created <artifact-id>` lines), and the step ends with the progress
event instead of the skill's Output summary.

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
