# ADR 0126: Replace project-local agent files through a same-directory temporary file

## Status

Accepted

## Context

The customizer writes user-owned Markdown files. A direct write can truncate a
destination before a later write failure, and deleting the destination before
rename creates a window in which a failed replacement loses the extension
point. Windows can also reject a rename over a locked existing file.

## Decision

Build the complete patched bytes in memory, write them to a uniquely named
temporary sibling in the destination directory, and rename that temporary file
over the destination. On write or rename failure, remove the temporary file
when possible, leave the existing destination untouched, and return a
classified `persistence-failed` result. Never delete the destination as a
fallback.

## Alternatives Considered

- Write directly to the destination: rejected because a failure can expose
  truncated content.
- Delete the destination before renaming: rejected because a failed rename
  would lose the existing project-local extension point.

## Consequences

Successful writes are atomic at the filesystem replacement boundary. Failure
handling needs best-effort temporary-file cleanup and must surface Windows
replacement failures without turning optional customization into a setup
failure.

## Related

- `openspec/changes/persist-project-agent-overrides/design.md` — Decision
  “Replace local files atomically”.
