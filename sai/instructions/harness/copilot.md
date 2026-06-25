## Copilot OpenSpec Path Rules

When working with OpenSpec artifacts in a repository, treat `/openspec/` as the default workspace-root path.

- Prefer direct workspace-root paths such as `/openspec/config.yaml` and `/openspec/changes/{change-name}/design.md`.
- Do not search for OpenSpec artifacts with recursive glob prefixes such as `**/openspec/...` when the repository root is already known.
- If you need to verify an OpenSpec artifact, check the direct `/openspec/...` path first before trying any broader search.
- Assume the OpenSpec change directory lives under `/openspec/changes/{change-name}/` unless the user explicitly says their project uses a different layout.

Examples:

- Use `/openspec/changes/cookiebot-runtime-env/design.md`
- Do not use `**/openspec/changes/cookiebot-runtime-env/design.md`

## Copilot Git Rules

- If the user gives permission to make a `git commit`, you can also assume permission to run `git add`.

## Copilot Checkbox Discipline

<!-- GitHub Copilot does not mark checkboxes automatically — this rule is Copilot-specific. -->

- When executing or modifying an artifact that contains task-list checkboxes (primarily `implementation.md`), mark each checkbox `- [ ]` as `- [x]` immediately after the task is verified complete.
- Apply this only to artifacts you are actively executing or modifying, not to read-only reference documents such as specs, proposals, or design documents.
