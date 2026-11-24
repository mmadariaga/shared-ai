# Spec Step — Proposal

Active step: proposal. Write `proposal.md`, then report the `proposal` step.

Create and instruct the proposal through the OpenSpec CLI; no OpenSpec skill
is loaded.

1. Load project context on every run: read `openspec/config.yaml` (read
   `config.yml` only when `config.yaml` is absent) and apply its `context`
   string as a constraint on research and planning. When the file is missing
   or unreadable, continue without context.
2. On creation, run `openspec new change "<name>"` with the document's `Change
   name:` value. A refinement run skips it, because the change directory already
   exists.
3. When the document declares `Specs: none — <reason>` in `## Change` and
   `specs/` holds no file, merge `skip_specs: true` into the change's `.openspec.yaml` now,
   keeping every other key verbatim and never rewriting the whole file.
4. Run `openspec instructions proposal --change "<name>" --json` and write
   `proposal.md` to the `resolvedOutputPath` it returns, from its `template`,
   `instruction`, and `rules`, grounded in your research. `context` and `rules`
   constrain the content; keep both out of every artifact.
5. Stop there: `specs/**` is the next step.

Questions go out as a `needs_input` report, and the step ends with your report.

When the document carries `## Additional notes`, copy its content
byte-for-byte into the `## Request Additional Notes` section of `proposal.md`:
no rewriting, summarizing, translating, or merging. The section is
non-normative — derive no requirement, scenario, or scope from it, even when a
note reads like an obligation. Your own research findings still go to
`## Additional Notes`; never mix the two sections. When the document has no such
section, omit the section. A refinement run without a document keeps any existing
`## Request Additional Notes` section intact.
