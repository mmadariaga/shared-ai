# Implement invocation (shared neutral point)

Shared invocation of the implementation-plan generator. Fetched by `sai-3-implement` (fresh chat) and by the "continue now" branch of `sai-2-design` (same chat) so the load/run/completion contract lives in one place.

## Load instructions (in order)
Fetch @sai/instructions/glossary-format.md
Fetch @sai/instructions/implement.md and follow those instructions exactly.
Fetch @sai/instructions/remember.md

## Run
**User's request:** $ARGUMENTS

## Completion
MANDATORY STOP: Once `openspec/changes/{change-name}/implementation.md` is written your work is COMPLETE. Do NOT execute any steps, run verification commands, mark any checkboxes, or modify any project file. That is sai-4-apply's job. STOP and print exactly: "Implementation plan done in openspec/changes/{name}/. Review and run `/sai-4-apply {name}` (--fast-track) **in a new chat** when ready."
