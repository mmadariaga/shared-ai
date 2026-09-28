# `/sai-retire-docs`

## Command function

Analyzes documented decisions and specifications that may be outdated and proposes which ones can be removed from the active documentation set.

## Flags and behavior modifiers

It has no documented behavior flags.

## In detail

The command reviews the active indexes and documents for architecture decisions, design decisions, and related specifications. It looks for signs that a decision no longer describes the current system, has been replaced, or no longer provides useful guidance.

For each possible candidate, it gathers bounded evidence and explains why it could be removed. It also distinguishes documentation that is genuinely outdated from documentation that remains valid even though the surrounding code has changed.

Removal is never automatic. The user receives a separate proposal for each candidate and must explicitly confirm which ones should be archived. An archived decision record moves to its family's `archive/` folder and its index entry moves to the historical section of the same index; a retired specification moves to `openspec/specs/_archived/`. A candidate that other active documents still link to stays in place. Rejected candidates remain where they are, and the command modifies no other document.
