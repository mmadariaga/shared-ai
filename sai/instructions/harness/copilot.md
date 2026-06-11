## Copilot OpenSpec Path Rules

When working with OpenSpec artifacts in a repository, treat `/openspec/` as the default workspace-root path.

- Prefer direct workspace-root paths such as `/openspec/config.yaml` and `/openspec/changes/{change-name}/design.md`.
- Do not search for OpenSpec artifacts with recursive glob prefixes such as `**/openspec/...` when the repository root is already known.
- If you need to verify an OpenSpec artifact, check the direct `/openspec/...` path first before trying any broader search.
- Assume the OpenSpec change directory lives under `/openspec/changes/{change-name}/` unless the user explicitly says their project uses a different layout.

Examples:

- Use `/openspec/changes/cookiebot-runtime-env/design.md`
- Do not use `**/openspec/changes/cookiebot-runtime-env/design.md`
